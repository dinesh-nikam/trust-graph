import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  getWalletNonce,
  linkWallet,
} from '../controllers/authController.ts';
import { authRequired } from '../middleware/auth.ts';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);
router.get('/me', authRequired, getMe);
router.get('/wallet-nonce', authRequired, getWalletNonce);
router.post('/link-wallet', authRequired, linkWallet);

export default router;
