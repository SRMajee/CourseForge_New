import { StateGraph, END } from "@langchain/langgraph";
import { modelGateway, TaskTier } from "../services/ModelGateway";
import { PROMPTS } from "../prompts/prompts";
import { outlineSchema, CourseOutline } from "../parsers/courseSchema";
import { researchService } from "../../services/ResearchService";
import { z } from "zod";
import logger from "../../utils/logger";
import { getVectorStore } from "../../services/vectorStore";
import { redisClient } from "../../config/redis";
import { RedisSaver } from "../checkpointers/RedisSaver";

// 1. Define the State
interface CourseState {
  topic: string;
  userContext: string; // User answers/preferences
  webContext: string; // Research data
  ragContext: string; // Vector store data
  draft: CourseOutline | null;
  critique: string | null;
  score: number;
  iterations: number;
  approved: boolean;
}

// 2. Define Schema for the Critique Node (Internal use only)
const critiqueSchema = z.object({
  approved: z.boolean(),
  score: z.number(),
  critique: z.string(),
});

// 3. Define Nodes
const humanApprovalNode = async (state: CourseState) => {
  logger.info("⏸️ Graph: Waiting for Human Approval...");
  return { approved: true };
};

const researchNode = async (
  state: CourseState,
): Promise<Partial<CourseState>> => {
  logger.info(`🕵️ Graph: Researching "${state.topic}"...`);
  // Re-use your existing research service
  const webContext = await researchService.getTechnicalContext(state.topic);
  return { webContext };
};

const retrievalNode = async (
  state: CourseState,
): Promise<Partial<CourseState>> => {
  logger.info(
    `📚 Graph: Retrieving internal knowledge for "${state.topic}"...`,
  );
  try {
    const vectorStore = getVectorStore();
    // Search for relevant documents
    const results = await vectorStore.similaritySearch(state.topic, 3);

    if (results.length > 0) {
      const ragContext = results.map((doc) => doc.pageContent).join("\n\n");
      logger.info(`✅ Graph: Found ${results.length} relevant internal docs.`);
      return { ragContext };
    }

    return { ragContext: "" };
  } catch (error) {
    logger.warn("⚠️ Graph: RAG Retrieval failed (skipping):", error);
    return { ragContext: "" };
  }
};

const draftNode = async (state: CourseState): Promise<Partial<CourseState>> => {
  logger.info(`✍️ Graph: Drafting syllabus (Iter: ${state.iterations})...`);

  // Use "Smart" model for drafting
  const model = modelGateway.getChatModel(TaskTier.LOGIC_REASONING);
  const chain = PROMPTS.COURSE_OUTLINE.pipe(
    model.withStructuredOutput(outlineSchema),
  );

  const draft = await chain.invoke({
    topic: state.topic,
    scopingContext: state.userContext,
    webContext: state.webContext,
    ragContext: state.ragContext,
  });

  return { draft, iterations: state.iterations + 1 };
};

const critiqueNode = async (
  state: CourseState,
): Promise<Partial<CourseState>> => {
  logger.info("⚖️ Graph: Critiquing draft...");

  // Use "Smart" model for critique
  const model = modelGateway.getChatModel(TaskTier.LOGIC_REASONING);
  const chain = PROMPTS.CRITIQUE_OUTLINE.pipe(
    model.withStructuredOutput(critiqueSchema),
  );

  const result = (await chain.invoke({
    topic: state.topic,
    draft: JSON.stringify(state.draft),
  })) as z.infer<typeof critiqueSchema>;

  return {
    approved: result.approved,
    critique: result.critique,
    score: result.score,
  };
};

const refineNode = async (
  state: CourseState,
): Promise<Partial<CourseState>> => {
  logger.info(`🔧 Graph: Refining draft. Feedback: "${state.critique}"`);

  const model = modelGateway.getChatModel(TaskTier.LOGIC_REASONING);
  const chain = PROMPTS.REFINE_OUTLINE.pipe(
    model.withStructuredOutput(outlineSchema),
  );

  const newDraft = await chain.invoke({
    draft: JSON.stringify(state.draft),
    critique: state.critique,
  });

  return { draft: newDraft, iterations: state.iterations + 1 };
};

// 4. Build the Graph
const workflow = new StateGraph<CourseState>({
  channels: {
    topic: null,
    userContext: null,
    webContext: null,
    ragContext: null,
    draft: null,
    critique: null,
    score: null,
    iterations: null,
    approved: null,
  },
})
  .addNode("research_topic", researchNode)
  .addNode("retrieve_context", retrievalNode)
  .addNode("generate_draft", draftNode)
  .addNode("analyze_draft", critiqueNode)
  .addNode("refine_draft", refineNode)
  .addNode("human_approval", humanApprovalNode)

  .addEdge("research_topic", "retrieve_context")
  .addEdge("retrieve_context", "generate_draft")
  .addEdge("generate_draft", "analyze_draft")

  // Logic Loop
  .addConditionalEdges("analyze_draft", (state: CourseState) => {
    if (state.approved || state.iterations >= 3) {
      return "human_approval";
    }
    return "refine_draft";
  })
  .addEdge("refine_draft", "analyze_draft")

  .setEntryPoint("research_topic");

// ✅ NEW: Initialize Redis Checkpointer
// Uses the existing IORedis client from config/redis.ts
const checkpointer = new RedisSaver(redisClient);

export const courseGraph = workflow.compile({
  checkpointer: checkpointer, // 👈 Enable Redis Persistence
  interruptBefore: ["human_approval"], // 👈 PAUSE EXECUTION HERE
});
