import mongoose, { Schema, Document } from 'mongoose';

export interface ITable extends Document {
  tableNumber: number;
  isActive: boolean;
  currentOrderId?: mongoose.Types.ObjectId;
  lastActivatedAt?: Date;
  lastDeactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const tableSchema = new Schema<ITable>({
  tableNumber: { type: Number, required: true, unique: true },
  isActive: { type: Boolean, default: false },
  currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  lastActivatedAt: Date,
  lastDeactivatedAt: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
tableSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Table = mongoose.model<ITable>('Table', tableSchema); 