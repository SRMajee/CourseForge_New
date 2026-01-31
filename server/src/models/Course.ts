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
  createdAt: Date;
  updatedAt: Date;
}

const CourseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: String, required: true, index: true }, // Index for "My Courses"
    tags: [{ type: String, trim: true }],
    modules: [{ type: Schema.Types.ObjectId, ref: "Module" }],
    thumbnailUrl: { type: String }, // Can be null if API fails
    generationMode: {
      type: String,
      enum: ["standard", "pro"],
      default: "standard", // Preserves legacy behavior
    },
    feedback: {
      type: String,
      enum: ["like", "dislike", null],
      default: null,
    },
  },
  { timestamps: true },
);

// Index for Dashboard sorting (Newest first)
CourseSchema.index({ userId: 1, createdAt: -1 });

export const Course = mongoose.model<ICourse>("Course", CourseSchema);
