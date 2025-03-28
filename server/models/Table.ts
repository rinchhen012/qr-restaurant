import mongoose, { Schema, Document } from 'mongoose';

export interface Position {
  x: number;
  y: number;
}

export interface ITable extends Document {
  tableNumber: number;
  isActive: boolean;
  currentOrderId?: mongoose.Types.ObjectId;
  lastActivatedAt?: Date;
  lastDeactivatedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  position: Position;
  shape: 'square' | 'round' | 'rectangle';
}

const positionSchema = new Schema<Position>({
  x: { type: Number, default: 50 },
  y: { type: Number, default: 50 }
}, { _id: false });

const tableSchema = new Schema<ITable>({
  tableNumber: { type: Number, required: true, unique: true },
  isActive: { type: Boolean, default: false },
  currentOrderId: { type: Schema.Types.ObjectId, ref: 'Order' },
  lastActivatedAt: Date,
  lastDeactivatedAt: Date,
  position: { type: positionSchema, default: { x: 50, y: 50 } },
  shape: { type: String, enum: ['square', 'round', 'rectangle'], default: 'square' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
tableSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export const Table = mongoose.model<ITable>('Table', tableSchema); 