import mongoose, { Schema, Document } from "mongoose";

export interface ICacheEntry extends Document {
  key: string;
  topic: string;
  data: any;
  type: "outline" | "lesson";
  createdAt: Date;
}

const CacheEntrySchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  topic: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  type: { type: String, enum: ["outline", "lesson"], default: "outline" },
  createdAt: { type: Date, default: Date.now, expires: "90d" },
});

// Text index for fuzzy search
CacheEntrySchema.index({ topic: "text" });

export const CacheEntry = mongoose.model<ICacheEntry>(
  "CacheEntry",
  CacheEntrySchema,
);
