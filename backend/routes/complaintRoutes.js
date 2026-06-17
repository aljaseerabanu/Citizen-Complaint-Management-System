import express from 'express';
import Complaint from '../models/Complaint.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// GET all complaints (with optional filters)
router.get('/', protect, async (req, res) => {
  try {
    const { status, priority, department } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (department) query.department = department;
    
    const complaints = await Complaint.find(query)
      .populate('citizen', 'name email')
      .sort({ createdAt: -1 });
    
    // Calculate analytics
    const analytics = {
      total: complaints.length,
      pending: complaints.filter(c => c.status === 'Pending').length,
      inProgress: complaints.filter(c => c.status === 'In Progress').length,
      resolved: complaints.filter(c => c.status === 'Resolved').length,
      rejected: complaints.filter(c => c.status === 'Rejected' || c.status === 'Rejected').length
    };

    res.json({ 
      success: true,
      complaints,
      analytics 
    });
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to fetch complaints',
      message: error.message
    });
  }
});

// GET complaints by department
router.get('/department/:department', protect, async (req, res) => {
  try {
    const { department } = req.params;
    
    const complaints = await Complaint.find({ department })
      .populate('citizen', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      complaints,
      count: complaints.length
    });
  } catch (error) {
    console.error('Error fetching department complaints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints',
      message: error.message
    });
  }
});

// GET user's own complaints
router.get('/my-complaints', protect, async (req, res) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      complaints,
      count: complaints.length
    });
  } catch (error) {
    console.error('Error fetching my complaints:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch your complaints',
      message: error.message
    });
  }
});

// GET single complaint by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email phone');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      complaint
    });
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint',
      message: error.message
    });
  }
});

// POST create new complaint
router.post('/', protect, async (req, res) => {
  try {
    const complaintData = {
      ...req.body,
      citizen: req.user._id,
      status: 'Pending'
    };

    const complaint = await Complaint.create(complaintData);
    
    // Populate citizen info
    await complaint.populate('citizen', 'name email');

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('newComplaint', complaint);
    }

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint
    });
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create complaint',
      message: error.message
    });
  }
});

// PATCH update complaint status
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['Pending', 'In Progress', 'Resolved', 'Rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid status. Must be: Pending, In Progress, Resolved, or Rejected' 
      });
    }

    // Find and update complaint
    const complaint = await Complaint.findByIdAndUpdate(
      id,
      { 
        status: status,
        updatedAt: new Date()
      },
      { new: true, runValidators: true }
    ).populate('citizen', 'name email');

    if (!complaint) {
      return res.status(404).json({ 
        success: false,
        error: 'Complaint not found' 
      });
    }

    // Emit socket event for real-time update
    const io = req.app.get('io');
    if (io) {
      io.emit('complaintUpdated', complaint);
    }

    res.json({ 
      success: true, 
      message: 'Status updated successfully',
      complaint 
    });

  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to update complaint status',
      message: error.message
    });
  }
});

// PUT update entire complaint (for staff/admin)
router.put('/:id', protect, async (req, res) => {
  try {
    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('citizen', 'name email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.emit('complaintUpdated', complaint);
    }

    res.json({
      success: true,
      message: 'Complaint updated successfully',
      complaint
    });
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update complaint',
      message: error.message
    });
  }
});

// DELETE complaint (admin only)
router.delete('/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to delete complaints'
      });
    }

    const complaint = await Complaint.findByIdAndDelete(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    res.json({
      success: true,
      message: 'Complaint deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete complaint',
      message: error.message
    });
  }
});

export default router;