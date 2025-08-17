import mongoose, { Document, Schema } from 'mongoose';
import { PaymentStatus, PaymentMethod } from '../types/payment';

export interface IPayment extends Document {
  userId: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  description?: string;
  transactionId?: string;
  externalId?: string;
  processingFee?: number;
  processedAt?: Date;
  failureReason?: string;
  retryCount: number;
  lastRetryAt?: Date;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 3,
    maxlength: 3,
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  },
  description: {
    type: String,
    maxlength: 500,
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  externalId: {
    type: String,
    index: true,
    sparse: true,
  },
  processingFee: {
    type: Number,
    min: 0,
  },
  processedAt: {
    type: Date,
  },
  failureReason: {
    type: String,
    maxlength: 1000,
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastRetryAt: {
    type: Date,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  collection: 'payments',
});

// Indexes for better query performance
PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ transactionId: 1 }, { unique: true, sparse: true });

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);