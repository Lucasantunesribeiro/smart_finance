import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../types/payment';

export interface IPayment extends Document {
  userId: string;
  amount: number;
  currency: string;
  description: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  externalId?: string;
  processingFee?: number;
  processedAt?: Date;
  failureReason?: string;
  metadata?: Record<string, any>;
  retryCount: number;
  lastRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema: Schema = new Schema({
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
    default: 'USD',
    uppercase: true,
  },
  description: {
    type: String,
    required: true,
    maxlength: 500,
  },
  paymentMethod: {
    type: String,
    enum: Object.values(PaymentMethod),
    required: true,
  },
  status: {
    type: String,
    enum: Object.values(PaymentStatus),
    default: PaymentStatus.PENDING,
    index: true,
  },
  transactionId: {
    type: String,
    sparse: true,
    index: true,
  },
  externalId: {
    type: String,
    sparse: true,
    index: true,
  },
  processingFee: {
    type: Number,
    min: 0,
    default: 0,
  },
  processedAt: {
    type: Date,
  },
  failureReason: {
    type: String,
    maxlength: 1000,
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
  retryCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  lastRetryAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

PaymentSchema.index({ userId: 1, createdAt: -1 });
PaymentSchema.index({ status: 1, createdAt: -1 });
PaymentSchema.index({ externalId: 1 }, { sparse: true, unique: true });

PaymentSchema.methods.toJSON = function() {
  const payment = this.toObject();
  delete payment.__v;
  return payment;
};

export const Payment = mongoose.model<IPayment>('Payment', PaymentSchema);