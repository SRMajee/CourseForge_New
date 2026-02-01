import mongoose, { Schema, Document } from "mongoose";

// Robust Content Type Definition
export type ContentType =
  | "heading"
  | "paragraph"
  | "code"
  | "video"
  | "mcq"
  | "link";

export interface ILesson extends Document {
  title: string;
  module: mongoose.Types.ObjectId;
  objectives: string[];

  content: Array<{
    type: ContentType;
    text?: string;
    code?: string;
    language?: string;
    url?: string;
    query?: string;
    title?: string;
    description?: string;
    question?: string;
    options?: string[];
    answer?: number;
    explanation?: string;
  }>;

  isEnriched: boolean;
  audioUrls?: Record<string, string>;
  generationMode: "standard" | "pro";
  // ✅ NEW: History for Refinement
  history: Array<{
    timestamp: Date;
    instruction: string;
    content: any[]; // Snapshot of the content array
    generationMode: "standard" | "pro";
  }>;

  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema(
  {
    type: { type: String, required: true },
    text: { type: String },
    code: { type: String },
    language: { type: String },
    url: { type: String },
    title: { type: String },
    description: { type: String },
    query: { type: String },
    question: { type: String },
    options: { type: [String] },
    answer: { type: Number },
    explanation: { type: String },
  },
  { _id: false },
);

const LessonSchema = new Schema<ILesson>(
  {
    title: { type: String, required: true },
    module: { type: Schema.Types.ObjectId, ref: "Module", required: true },
    objectives: { type: [String], default: [] },
    content: { type: [ContentSchema], default: [] },
    audioUrls: { type: Schema.Types.Mixed, default: {} },
    isEnriched: { type: Boolean, default: false },
    generationMode: {
      type: String,
      enum: ["standard", "pro"],
      default: "standard",
    },
    // ✅ History Field
    history: [
      {
        timestamp: { type: Date, default: Date.now },
        instruction: { type: String },
        content: { type: [ContentSchema], default: [] },
        generationMode: {
          type: String,
          enum: ["standard", "pro"],
          default: "standard",
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

LessonSchema.index({ module: 1 });

export const Lesson = mongoose.model<ILesson>("Lesson", LessonSchema);
