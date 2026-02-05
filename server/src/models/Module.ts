import mongoose, { Schema, Document } from "mongoose";

export interface IModule extends Document {
  title: string;
  course: mongoose.Types.ObjectId;
  lessons: mongoose.Types.ObjectId[];
}

const ModuleSchema = new Schema<IModule>(
  {
    title: { type: String, required: true },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    lessons: [{ type: Schema.Types.ObjectId, ref: "Lesson" }],
  },
  { timestamps: true },
);

export const Module = mongoose.model<IModule>("Module", ModuleSchema);
