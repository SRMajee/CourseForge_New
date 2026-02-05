import mongoose, { Schema, Document } from "mongoose";

export interface ICacheEntry extends Document {
  key: string;
  data: any;
  topic: string;
  type: "course" | "lesson";
  createdAt: Date;
}

const CacheEntrySchema: Schema = new Schema({
  key: { type: String, required: true, unique: true, index: true },
  topic: { type: String, required: true },
  data: { type: Schema.Types.Mixed, required: true },
  type: { type: String, enum: ["course", "lesson"], default: "course" },
  createdAt: { type: Date, default: Date.now, expires: "90d" },
});

CacheEntrySchema.index({ key: "text", type: "text" });

export const CacheEntry = mongoose.model<ICacheEntry>(
  "CacheEntry",
  CacheEntrySchema,
);
