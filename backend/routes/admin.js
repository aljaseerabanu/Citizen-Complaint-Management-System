import express from 'express';
import {
  getAnalytics,
  getAllComplaints,
  getDepartmentStats,
  getAreaStats,
  getUserStats
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin'));

// Admin analytics routes
router.get('/analytics', getAnalytics);
router.get('/complaints', getAllComplaints);
router.get('/department-stats', getDepartmentStats);
router.get('/area-stats', getAreaStats);
router.get('/user-stats', getUserStats);

export default router;