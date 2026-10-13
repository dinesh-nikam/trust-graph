import type { Request, Response } from 'express';
import { WorkSubmission } from '../models/WorkSubmission.ts';
import { User } from '../models/User.ts';

export async function createSubmission(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const {
      workType,
      title,
      description,
      evidenceUrl,
      evidenceManifest,
      evidenceHash,
      metadataUri,
      workId,
      subjectAddress,
      transactionHash,
    } = req.body;

    if (!workType || !title || !description || !evidenceUrl || !evidenceManifest || !evidenceHash) {
      res.status(400).json({
        success: false,
        error: 'Missing required submission fields (workType, title, description, evidenceUrl, evidenceManifest, evidenceHash)',
      });
      return;
    }

    const user = await User.findById(req.user.id);
    const resolvedSubject = (user?.walletAddress || subjectAddress || '').toLowerCase();

    if (!resolvedSubject || !/^0x[0-9a-fA-F]{40}$/.test(resolvedSubject)) {
      res.status(400).json({
        success: false,
        error: 'A valid EVM subject wallet address is required. Please link your wallet or provide subjectAddress.',
      });
      return;
    }

    if (!/^0x[0-9a-fA-F]{64}$/.test(evidenceHash.trim())) {
      res.status(400).json({
        success: false,
        error: 'evidenceHash must be a valid 32-byte hexadecimal hash (0x...)',
      });
      return;
    }

    const submission = new WorkSubmission({
      workId: workId ? workId.trim().toLowerCase() : undefined,
      ownerUserId: req.user.id,
      subjectAddress: resolvedSubject,
      workType,
      title: title.trim(),
      description: description.trim(),
      evidenceUrl: evidenceUrl.trim(),
      evidenceManifest: evidenceManifest.trim(),
      evidenceHash: evidenceHash.trim().toLowerCase(),
      metadataUri: metadataUri ? metadataUri.trim() : evidenceUrl.trim(),
      transactionHash: transactionHash ? transactionHash.trim().toLowerCase() : undefined,
      status: 'PENDING',
    });

    await submission.save();

    res.status(201).json({
      success: true,
      submission,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create work submission';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getMySubmissions(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const user = await User.findById(req.user.id);
    const userWallet = user?.walletAddress?.toLowerCase();

    const query = userWallet
      ? { $or: [{ ownerUserId: req.user.id }, { subjectAddress: userWallet }] }
      : { ownerUserId: req.user.id };

    const submissions = await WorkSubmission.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      submissions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve submissions';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getPublicSubmissions(req: Request, res: Response): Promise<void> {
  try {
    const { address, status, workType } = req.query;
    const filter: Record<string, unknown> = {};

    if (address && typeof address === 'string') {
      filter.subjectAddress = address.trim().toLowerCase();
    }
    if (status && typeof status === 'string') {
      filter.status = status.toUpperCase();
    }
    if (workType && typeof workType === 'string') {
      filter.workType = workType;
    }

    const submissions = await WorkSubmission.find(filter)
      .sort({ createdAt: -1 })
      .limit(100);

    res.status(200).json({
      success: true,
      count: submissions.length,
      submissions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve public submissions';
    res.status(500).json({ success: false, error: message });
  }
}

export async function getSubmissionById(req: Request, res: Response): Promise<void> {
  try {
    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Valid submission ID required' });
      return;
    }

    let submission = null;
    if (/^[0-9a-fA-F]{24}$/.test(id)) {
      submission = await WorkSubmission.findById(id);
    }
    if (!submission) {
      submission = await WorkSubmission.findOne({ workId: id.toLowerCase() });
    }
    if (!submission) {
      submission = await WorkSubmission.findOne({ evidenceHash: id.toLowerCase() });
    }

    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found' });
      return;
    }

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to retrieve submission';
    res.status(500).json({ success: false, error: message });
  }
}

export async function updateSubmissionTx(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Valid submission ID required' });
      return;
    }
    const { transactionHash, workId, attestationId } = req.body;

    const submission = await WorkSubmission.findById(id);
    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found' });
      return;
    }

    if (submission.ownerUserId.toString() !== req.user.id) {
      res.status(403).json({ success: false, error: 'Not authorized to update this submission' });
      return;
    }

    if (transactionHash) {
      submission.transactionHash = transactionHash.trim().toLowerCase();
    }
    if (workId) {
      submission.workId = workId.trim().toLowerCase();
    }
    if (attestationId) {
      submission.attestationId = attestationId.trim();
    }

    await submission.save();

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update transaction';
    res.status(500).json({ success: false, error: message });
  }
}

export async function reviewSubmission(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const rawId = req.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id || typeof id !== 'string') {
      res.status(400).json({ success: false, error: 'Valid submission ID required' });
      return;
    }
    const { status, statusReason, transactionHash, attestationId, reviewerAddress } = req.body;

    if (!['VERIFIED', 'REJECTED', 'REVOKED'].includes(status)) {
      res.status(400).json({ success: false, error: 'Status must be VERIFIED, REJECTED, or REVOKED' });
      return;
    }

    const submission = await WorkSubmission.findById(id);
    if (!submission) {
      res.status(404).json({ success: false, error: 'Submission not found' });
      return;
    }

    // State transition guard
    if (submission.status === 'REJECTED' && status !== 'REJECTED') {
      res.status(400).json({ success: false, error: 'Cannot transition from REJECTED state' });
      return;
    }

    submission.status = status;
    submission.statusReason = statusReason ? statusReason.trim() : undefined;
    submission.reviewedBy = reviewerAddress || req.user.walletAddress || req.user.email;
    submission.reviewedAt = new Date();

    if (transactionHash) {
      submission.transactionHash = transactionHash.trim().toLowerCase();
    }
    if (attestationId) {
      submission.attestationId = attestationId.trim();
    }

    await submission.save();

    res.status(200).json({
      success: true,
      submission,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Review update failed';
    res.status(500).json({ success: false, error: message });
  }
}
