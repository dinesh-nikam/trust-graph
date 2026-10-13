import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { verifyMessage } from 'viem';
import { User, type IUser } from '../models/User.ts';
import { config } from '../config/env.ts';

const COOKIE_NAME = 'trustgraph_jwt';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: (config.nodeEnv === 'production' ? 'none' : 'lax') as 'none' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

function generateToken(user: IUser): string {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      walletAddress: user.walletAddress,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, username } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      res.status(400).json({ success: false, error: 'Name is required' });
      return;
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      res.status(400).json({ success: false, error: 'A valid email address is required' });
      return;
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      res.status(409).json({ success: false, error: 'An account with this email already exists' });
      return;
    }

    if (username && typeof username === 'string') {
      const cleanUsername = username.trim().toLowerCase();
      const existingUsername = await User.findOne({ username: cleanUsername });
      if (existingUsername) {
        res.status(409).json({ success: false, error: 'This username is already taken' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      username: username ? username.trim().toLowerCase() : undefined,
    });

    await user.save();

    const token = generateToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(201).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    res.status(500).json({ success: false, error: message });
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Email and password are required' });
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    const token = generateToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    res.status(500).json({ success: false, error: message });
  }
}

export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ success: true, message: 'Logged out successfully' });
}

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve session';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getWalletNonce(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const nonce = crypto.randomBytes(16).toString('hex');
    await User.findByIdAndUpdate(req.user.id, { walletNonce: nonce });

    const messageToSign = `Sign this message to associate your wallet with TrustGraph:\n\nNonce: ${nonce}\nDomain: ${config.clientOrigin}\nChain: Monad Testnet (10143)`;

    res.status(200).json({
      success: true,
      nonce,
      messageToSign,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to generate nonce';
    res.status(500).json({ success: false, error: message });
  }
}

export async function linkWallet(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { address, signature } = req.body;

    if (!address || !signature || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      res.status(400).json({ success: false, error: 'Valid wallet address and signature are required' });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.walletNonce) {
      res.status(400).json({ success: false, error: 'Please request a wallet nonce before signing' });
      return;
    }

    const expectedMessage = `Sign this message to associate your wallet with TrustGraph:\n\nNonce: ${user.walletNonce}\nDomain: ${config.clientOrigin}\nChain: Monad Testnet (10143)`;

    const isValidSignature = await verifyMessage({
      address: address as `0x${string}`,
      message: expectedMessage,
      signature: signature as `0x${string}`,
    });

    if (!isValidSignature) {
      res.status(400).json({ success: false, error: 'Cryptographic signature verification failed' });
      return;
    }

    // Check if wallet is already linked to another user
    const existingOwner = await User.findOne({
      walletAddress: address.toLowerCase(),
      _id: { $ne: user._id },
    });
    if (existingOwner) {
      res.status(409).json({ success: false, error: 'This wallet address is already linked to another account' });
      return;
    }

    // Consume nonce and save wallet address
    user.walletAddress = address.toLowerCase();
    user.walletNonce = undefined;
    await user.save();

    // Re-issue cookie with updated wallet address
    const token = generateToken(user);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Wallet linking failed';
    res.status(500).json({ success: false, error: message });
  }
}
