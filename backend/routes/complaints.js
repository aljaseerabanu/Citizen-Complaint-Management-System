import express from 'express';
import { protect, authorize } from '../middleware/auth.js';
import {
  createComplaint,
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  deleteComplaint,
  getMyComplaints,
  getDepartmentComplaints,
  updateComplaintStatus,
  assignComplaint
} from '../controllers/complaintController.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// @route   POST /api/complaints
// @desc    Create new complaint
// @access  Private (Citizen)
router.post('/', authorize('citizen'), createComplaint);

// @route   GET /api/complaints/my-complaints
// @desc    Get current user's complaints
// @access  Private (Citizen)
router.get('/my-complaints', authorize('citizen'), getMyComplaints);

// @route   GET /api/complaints
// @desc    Get all complaints (with filters)
// @access  Private (Staff, Admin)
router.get('/', authorize('staff', 'admin'), getAllComplaints);

// @route   GET /api/complaints/department/:department
// @desc    Get complaints by department
// @access  Private (Staff, Admin)
router.get('/department/:department', authorize('staff', 'admin'), getDepartmentComplaints);

// @route   GET /api/complaints/:id
// @desc    Get complaint by ID
// @access  Private
router.get('/:id', getComplaintById);

// @route   PUT /api/complaints/:id
// @desc    Update complaint
// @access  Private (Staff, Admin)
router.put('/:id', authorize('staff', 'admin'), updateComplaint);

// @route   PATCH /api/complaints/:id/status
// @desc    Update complaint status
// @access  Private (Staff, Admin)
router.patch('/:id/status', authorize('staff', 'admin'), updateComplaintStatus);

// @route   PATCH /api/complaints/:id/assign
// @desc    Assign complaint to staff
// @access  Private (Admin)
router.patch('/:id/assign', authorize('admin'), assignComplaint);

// @route   DELETE /api/complaints/:id
// @desc    Delete complaint
// @access  Private (Admin)
router.delete('/:id', authorize('admin'), deleteComplaint);

export default router;