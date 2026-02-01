import mongoose, { Schema, Document } from "mongoose";

export interface ICourse extends Document {
  title: string;
  description: string;
  userId: string; // Auth0 User ID
  tags: string[];
  modules: mongoose.Types.ObjectId[];
  thumbnailUrl?: string;
  generationMode: "standard" | "pro";
  feedback?: "like" | "dislike" | null;

  // ✅ History now tracks the Mode of that version
  history: Array<{
    timestamp: Date;
    instruction: string;
    modules: mongoose.Types.ObjectId[];
    generationMode: "standard" | "pro"; // 👈 Added
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    tags: [{ type: String, trim: true }],
    modules: [{ type: Schema.Types.ObjectId, ref: "Module" }],
    thumbnailUrl: { type: String },
    generationMode: {
      type: String,
      enum: ["standard", "pro"],
      default: "standard",
    },
    feedback: {
      type: String,
      enum: ["like", "dislike", null],
      default: null,
    },
    // ✅ Updated History Schema
    history: [
      {
        timestamp: { type: Date, default: Date.now },
        instruction: { type: String },
        modules: [{ type: Schema.Types.ObjectId, ref: "Module" }],
        generationMode: { type: String, enum: ["standard", "pro"] }, // 👈 Store mode here
      },
    ],
  },
  { timestamps: true },
);

CourseSchema.index({ userId: 1, createdAt: -1 });

export const Course = mongoose.model<ICourse>("Course", CourseSchema);
