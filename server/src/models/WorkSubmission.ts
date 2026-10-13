import mongoose, { type Document, Schema } from 'mongoose';

export type SubmissionStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'REVOKED';

export interface IWorkSubmission extends Document {
  workId?: string;
  ownerUserId: mongoose.Types.ObjectId;
  subjectAddress: string;
  workType: string;
  title: string;
  description: string;
  evidenceUrl: string;
  evidenceManifest: string;
  evidenceHash: string;
  metadataUri?: string;
  transactionHash?: string;
  attestationId?: string;
  status: SubmissionStatus;
  statusReason?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WorkSubmissionSchema = new Schema<IWorkSubmission>(
  {
    workId: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner user ID is required'],
      index: true,
    },
    subjectAddress: {
      type: String,
      required: [true, 'Subject wallet address is required'],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^0x[0-9a-fA-F]{40}$/, 'Invalid EVM address format'],
    },
    workType: {
      type: String,
      required: [true, 'Work type is required'],
      enum: [
        'CONTRACT_DEPLOYED',
        'CHALLENGE_COMPLETED',
        'CONTRIBUTION_VERIFIED',
        'SMART_CONTRACT',
        'GITHUB_CONTRIBUTION',
        'HACKATHON_PROJECT',
      ],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },
    evidenceUrl: {
      type: String,
      required: [true, 'Evidence primary URL is required'],
      trim: true,
    },
    evidenceManifest: {
      type: String,
      required: [true, 'Evidence manifest is required'],
      trim: true,
    },
    evidenceHash: {
      type: String,
      required: [true, 'Evidence hash is required'],
      lowercase: true,
      trim: true,
      index: true,
      match: [/^0x[0-9a-fA-F]{64}$/, 'Evidence hash must be a 32-byte hexadecimal string'],
    },
    metadataUri: {
      type: String,
      trim: true,
    },
    transactionHash: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^0x[0-9a-fA-F]{64}$/, 'Transaction hash must be a 32-byte hexadecimal string'],
    },
    attestationId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'REVOKED'],
      default: 'PENDING',
      index: true,
    },
    statusReason: {
      type: String,
      trim: true,
    },
    reviewedBy: {
      type: String,
      lowercase: true,
      trim: true,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

export const WorkSubmission = mongoose.model<IWorkSubmission>(
  'WorkSubmission',
  WorkSubmissionSchema
);
