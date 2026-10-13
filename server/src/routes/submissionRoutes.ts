import { Router } from 'express';
import {
  createSubmission,
  getMySubmissions,
  getPublicSubmissions,
  getSubmissionById,
  updateSubmissionTx,
  reviewSubmission,
} from '../controllers/submissionController.ts';
import { authRequired } from '../middleware/auth.ts';

const router = Router();

// Public routes
router.get('/', getPublicSubmissions);
router.get('/detail/:id', getSubmissionById);

// Authenticated routes
router.post('/', authRequired, createSubmission);
router.get('/my', authRequired, getMySubmissions);
router.patch('/:id/tx', authRequired, updateSubmissionTx);
router.patch('/:id/review', authRequired, reviewSubmission);

export default router;
