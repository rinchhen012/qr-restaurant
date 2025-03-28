import mongoose, { Schema, Document } from 'mongoose';
import { ITable } from './Table';

export interface IFloorPlan extends Document {
  name: string;
  tables: mongoose.Types.ObjectId[] | ITable[];
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const floorPlanSchema = new Schema<IFloorPlan>({
  name: { type: String, required: true },
  tables: [{ type: Schema.Types.ObjectId, ref: 'Table' }],
  isDefault: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Update the updatedAt timestamp before saving
floorPlanSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Ensure there's only one default floor plan
floorPlanSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await mongoose.model('FloorPlan').updateMany(
      { _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

export const FloorPlan = mongoose.model<IFloorPlan>('FloorPlan', floorPlanSchema); 