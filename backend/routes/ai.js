import express from 'express';
import {
  analyzeComplaint,
  translateText,
  generateAutoResponse,
  detectSpam
} from '../controllers/aiController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Analyze complaint with AI
router.post('/analyze', analyzeComplaint);

// Translate text
router.post('/translate', translateText);

// Generate auto-response for status updates
router.post('/generate-response', authorize('staff', 'admin'), generateAutoResponse);

// Detect spam/irrelevant complaints
router.post('/detect-spam', detectSpam);

export default router;