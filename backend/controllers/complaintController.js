import Complaint from '../models/Complaint.js';
import User from '../models/User.js';

// @desc    Create new complaint
// @route   POST /api/complaints
// @access  Private (Citizen)
export const createComplaint = async (req, res) => {
  try {
    const {
      title,
      description,
      department,
      priority,
      location,
      address,
      locality,
      media,
      aiAnalysis
    } = req.body;

    console.log('📝 Creating complaint:', { title, department, location });

    // Validate required fields
    if (!title || !description || !department || !location) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, description, department, and location'
      });
    }

    // Create complaint
    const complaint = await Complaint.create({
      title,
      description,
      department,
      priority: priority || 'Medium',
      citizen: req.user._id,
      location: {
        type: 'Point',
        coordinates: [location.longitude, location.latitude],
        accuracy: location.accuracy
      },
      address: address || '',
      locality: locality || '',
      media: media ? {
        type: media.type,
        url: media.data,
        mimeType: media.mimeType
      } : undefined,
      aiAnalysis: aiAnalysis || {}
    });

    // Calculate priority based on location and age
    await complaint.calculatePriority();
    await complaint.save();

    console.log('✅ Complaint created:', complaint._id);

    res.status(201).json({
      success: true,
      message: 'Complaint submitted successfully',
      complaint
    });

  } catch (error) {
    console.error('❌ Create complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating complaint',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get all complaints
// @route   GET /api/complaints
// @access  Private (Staff, Admin)
export const getAllComplaints = async (req, res) => {
  try {
    const { department, status, priority } = req.query;
    
    let filter = {};
    
    // If user is staff, only show their department
    if (req.user.role === 'staff') {
      filter.department = req.user.department;
    }
    
    // Apply additional filters
    if (department && req.user.role === 'admin') {
      filter.department = department;
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const complaints = await Complaint.find(filter)
      .populate('citizen', 'name email phone')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });

  } catch (error) {
    console.error('❌ Get complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching complaints'
    });
  }
};

// @desc    Get complaint by ID
// @route   GET /api/complaints/:id
// @access  Private
export const getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('citizen', 'name email phone')
      .populate('assignedTo', 'name email department');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check authorization
    if (req.user.role === 'citizen' && complaint.citizen._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this complaint'
      });
    }

    if (req.user.role === 'staff' && complaint.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this complaint'
      });
    }

    res.status(200).json({
      success: true,
      complaint
    });

  } catch (error) {
    console.error('❌ Get complaint by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching complaint'
    });
  }
};

// @desc    Get my complaints
// @route   GET /api/complaints/my-complaints
// @access  Private (Citizen)
export const getMyComplaints = async (req, res) => {
  try {
    const complaints = await Complaint.find({ citizen: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });

  } catch (error) {
    console.error('❌ Get my complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching complaints'
    });
  }
};

// @desc    Get complaints by department
// @route   GET /api/complaints/department/:department
// @access  Private (Staff, Admin)
export const getDepartmentComplaints = async (req, res) => {
  try {
    const { department } = req.params;
    
    // Staff can only view their own department
    if (req.user.role === 'staff' && req.user.department !== department) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view complaints from other departments'
      });
    }

    const complaints = await Complaint.find({ department })
      .populate('citizen', 'name email phone')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: complaints.length,
      complaints
    });

  } catch (error) {
    console.error('❌ Get department complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching complaints'
    });
  }
};

// @desc    Update complaint
// @route   PUT /api/complaints/:id
// @access  Private (Staff, Admin)
export const updateComplaint = async (req, res) => {
  try {
    let complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check authorization
    if (req.user.role === 'staff' && complaint.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this complaint'
      });
    }

    const { staffNotes, status, priority } = req.body;

    if (staffNotes !== undefined) complaint.staffNotes = staffNotes;
    if (status) complaint.status = status;
    if (priority) complaint.priority = priority;

    // Set resolvedAt if status is changed to Resolved
    if (status === 'Resolved' && complaint.status !== 'Resolved') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      complaint
    });

  } catch (error) {
    console.error('❌ Update complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating complaint'
    });
  }
};

// @desc    Update complaint status
// @route   PATCH /api/complaints/:id/status
// @access  Private (Staff, Admin)
export const updateComplaintStatus = async (req, res) => {
  try {
    const { status, staffNotes, rejectionReason } = req.body;

    let complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Check authorization
    if (req.user.role === 'staff' && complaint.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this complaint'
      });
    }

    complaint.status = status;
    
    if (staffNotes) complaint.staffNotes = staffNotes;
    if (rejectionReason) complaint.rejectionReason = rejectionReason;

    // Set resolvedAt timestamp
    if (status === 'Resolved') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    console.log(`✅ Complaint ${complaint._id} status updated to ${status}`);

    res.status(200).json({
      success: true,
      message: 'Complaint status updated successfully',
      complaint
    });

  } catch (error) {
    console.error('❌ Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating complaint status'
    });
  }
};

// @desc    Assign complaint to staff
// @route   PATCH /api/complaints/:id/assign
// @access  Private (Admin)
export const assignComplaint = async (req, res) => {
  try {
    const { staffId } = req.body;

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // Verify staff member exists and is in correct department
    const staff = await User.findById(staffId);

    if (!staff || staff.role !== 'staff') {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff member'
      });
    }

    if (staff.department !== complaint.department) {
      return res.status(400).json({
        success: false,
        message: 'Staff member is not in the correct department'
      });
    }

    complaint.assignedTo = staffId;
    
    // Optionally change status to 'In Progress'
    if (complaint.status === 'Pending') {
      complaint.status = 'In Progress';
    }

    await complaint.save();

    console.log(`✅ Complaint ${complaint._id} assigned to ${staff.name}`);

    res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully',
      complaint
    });

  } catch (error) {
    console.error('❌ Assign complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while assigning complaint'
    });
  }
};

// @desc    Delete complaint
// @route   DELETE /api/complaints/:id
// @access  Private (Admin)
export const deleteComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    await complaint.deleteOne();

    console.log(`✅ Complaint ${complaint._id} deleted`);

    res.status(200).json({
      success: true,
      message: 'Complaint deleted successfully'
    });

  } catch (error) {
    console.error('❌ Delete complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting complaint'
    });
  }
};