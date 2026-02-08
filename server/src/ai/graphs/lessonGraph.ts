import { StateGraph, END } from "@langchain/langgraph";
import { modelGateway, TaskTier } from "../services/ModelGateway";
import { PROMPTS } from "../prompts/prompts";
import { lessonResponseSchema } from "../parsers/courseSchema";
import { codeExecutionService } from "../../services/CodeExecutionService";
import { youtubeService } from "../../services/youtubeService";
import { getVectorStore } from "../../services/vectorStore";
import { z } from "zod";
import logger from "../../utils/logger";

// 1. Define State
interface LessonState {
  // Inputs
  topic: string;
  courseTitle: string;
  moduleTitle: string;

  // Refinement Inputs (Optional)
  instruction?: string;
  currentContent?: any[];

  // Configuration
  modelTier?: TaskTier; // 👈 Allow dynamic tier selection

  // Working Data
  ragContext: string;
  objectives: string[];
  content: any[];
  codeErrors: { blockIndex: number; error: string }[];

  // Control
  iterations: number;
}

// 2. Nodes

const retrievalNode = async (
  state: LessonState,
): Promise<Partial<LessonState>> => {
  // Skip RAG if we are just refining existing content with a specific instruction
  if (state.instruction) {
    return { ragContext: "" };
  }

  logger.info(`📚 Graph: Retrieving context for "${state.topic}"...`);
  try {
    const vectorStore = getVectorStore();
    const searchQuery = `${state.topic} ${state.courseTitle}`;
    const results = await vectorStore.similaritySearch(searchQuery, 2);

    if (results.length > 0) {
      const ragContext = results.map((doc) => doc.pageContent).join("\n\n");
      return { ragContext };
    }
    return { ragContext: "" };
  } catch (error) {
    logger.warn("⚠️ Graph: RAG failed:", error);
    return { ragContext: "" };
  }
};

const generateNode = async (
  state: LessonState,
): Promise<Partial<LessonState>> => {
  // Default to CREATIVE if not specified
  const tier = state.modelTier || TaskTier.CREATIVE_WRITING;
  const model = modelGateway.getChatModel(tier);

  // ✅ FORK: Check if this is a Refinement or a Creation
  if (state.instruction && state.currentContent) {
    logger.info(
      `🏭 Graph: Refining lesson "${state.topic}" with instruction: "${state.instruction}"`,
    );

    const chain = PROMPTS.REFINE_LESSON.pipe(
      model.withStructuredOutput(lessonResponseSchema),
    );

    const result = (await chain.invoke({
      title: state.topic,
      content: state.currentContent,
      objectives: state.objectives || [],
      instruction: state.instruction,
    })) as z.infer<typeof lessonResponseSchema>;

    return {
      content: result.content,
      objectives: result.objectives, // Allow AI to refine objectives too
      iterations: 0,
    };
  } else {
    logger.info(`🏭 Graph: Generating new lesson for "${state.topic}"...`);

    const chain = PROMPTS.LESSON_CONTENT.pipe(
      model.withStructuredOutput(lessonResponseSchema),
    );

    const result = (await chain.invoke({
      topic: state.topic,
      ragContext: state.ragContext,
      courseTitle: state.courseTitle,
      moduleTitle: state.moduleTitle,
    })) as z.infer<typeof lessonResponseSchema>;

    return {
      content: result.content,
      objectives: result.objectives,
      iterations: 0,
    };
  }
};

// ... [verifyNode, fixNode, enrichNode remain exactly the same as Phase 3] ...
const verifyNode = async (
  state: LessonState,
): Promise<Partial<LessonState>> => {
  logger.info("🧪 Graph: Verifying code blocks...");
  const errors: { blockIndex: number; error: string }[] = [];
  const newContent = [...state.content];

  for (let i = 0; i < newContent.length; i++) {
    const block = newContent[i];
    if (
      block.type === "code" &&
      (!block.language || block.language === "python")
    ) {
      const result = await codeExecutionService.executePython(block.code);
      if (!result.success) {
        logger.warn(
          `❌ Code Error in block ${i}: ${result.error?.slice(0, 50)}...`,
        );
        errors.push({ blockIndex: i, error: result.error || "Unknown error" });
      }
    }
  }
  return { codeErrors: errors };
};

const fixNode = async (state: LessonState): Promise<Partial<LessonState>> => {
  logger.info(`🔧 Graph: Fixing ${state.codeErrors.length} code errors...`);
  const newContent = [...state.content];

  for (const err of state.codeErrors) {
    const block = newContent[err.blockIndex];
    if (block && block.type === "code") {
      const fixedCode = await codeExecutionService.fixPythonCode(
        block.code,
        err.error,
      );
      block.code = fixedCode;
    }
  }
  return {
    content: newContent,
    codeErrors: [],
    iterations: state.iterations + 1,
  };
};

const enrichNode = async (
  state: LessonState,
): Promise<Partial<LessonState>> => {
  logger.info("🎥 Graph: Enriching content with media...");

  const enrichedContent = await Promise.all(
    state.content.map(async (block) => {
      if (block.type === "video") {
        const query = block.query || state.topic;
        try {
          const videoData = await youtubeService.searchVideo(query);
          if (videoData) {
            return {
              type: "video",
              url: `https://www.youtube.com/watch?v=${videoData.videoId}`,
              title: videoData.title,
              thumbnail: videoData.thumbnail,
            };
          }
          return {
            type: "link",
            title: `Watch: ${query}`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
          };
        } catch (e) {
          return block;
        }
      }
      if (
        block.type === "link" &&
        (!block.url || block.url.includes("undefined"))
      ) {
        return {
          ...block,
          url: `https://www.google.com/search?q=${encodeURIComponent(block.title || state.topic)}`,
        };
      }
      return block;
    }),
  );
  return { content: enrichedContent };
};

// 3. Build Workflow
const workflow = new StateGraph<LessonState>({
  channels: {
    topic: null,
    courseTitle: null,
    moduleTitle: null,
    instruction: null, // 👈 New Channel
    currentContent: null, // 👈 New Channel
    modelTier: null, // 👈 New Channel
    ragContext: null,
    objectives: null,
    content: null,
    codeErrors: null,
    iterations: null,
  },
})
  .addNode("retrieve_context", retrievalNode)
  .addNode("generate_lesson", generateNode)
  .addNode("verify_code", verifyNode)
  .addNode("fix_code", fixNode)
  .addNode("enrich_content", enrichNode)

  .addEdge("retrieve_context", "generate_lesson")
  .addEdge("generate_lesson", "verify_code")

  .addConditionalEdges("verify_code", (state) => {
    if (
      state.codeErrors &&
      state.codeErrors.length > 0 &&
      state.iterations < 2
    ) {
      return "fix_code";
    }
    return "enrich_content";
  })

  .addEdge("fix_code", "verify_code")
  .addEdge("enrich_content", END)

  .setEntryPoint("retrieve_context");

export const lessonGraph = workflow.compile();
