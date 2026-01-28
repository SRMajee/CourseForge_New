import mongoose, { Schema, Document } from "mongoose";

export interface IFeedback extends Document {
  userId: string;
  generationId: string; // ID of the Lesson or Course created
  type: "implicit" | "explicit"; // Implicit = User Action, Explicit = Thumbs Up/Down
  signal: "positive" | "negative";
  action: "edit" | "copy" | "regenerate" | "complete";
  originalContent?: string; // What the AI gave
  finalContent?: string; // What the user changed it to (The "Gold Standard")
  createdAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    userId: { type: String, required: true, index: true },
    generationId: { type: String, required: true },
    type: { type: String, enum: ["implicit", "explicit"], required: true },
    signal: { type: String, enum: ["positive", "negative"], required: true },
    action: { type: String, required: true },
    originalContent: { type: String },
    finalContent: { type: String },
  },
  { timestamps: true },
);

export const Feedback = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
