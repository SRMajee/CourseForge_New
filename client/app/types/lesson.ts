export type ContentType =
  | "heading"
  | "paragraph"
  | "code"
  | "video"
  | "mcq"
  | "link";

// Using a Discriminated Union is safer for rendering than one giant interface
export type LessonContent =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "code"; code: string; language?: string }
  | { type: "video"; query: string; videoId?: string } // videoId might be populated by frontend search
  | { type: "link"; title: string; url: string; description: string }
  | {
      type: "mcq";
      question: string;
      options: string[];
      answer: number;
      explanation?: string;
    };

export interface Lesson {
  _id: string;
  title: string;
  module: string; // Module ID
  objectives: string[];

  // The content blocks
  content: LessonContent[];
  generationMode: "standard" | "pro";
  isEnriched: boolean;

  // Dictionary for multi-language audio
  // e.g. { "en": "https://...", "es": "https://..." }
  audioUrls?: Record<string, string>;

  createdAt: string;
  updatedAt?: string;
}
