import {
  BaseCheckpointSaver,
  Checkpoint,
  CheckpointMetadata,
  CheckpointTuple,
  SerializerProtocol,
} from "@langchain/langgraph-checkpoint";
import { Redis } from "ioredis";

/**
 * Custom Redis Checkpointer for LangGraph
 * Persists graph state to Redis using "checkpoint:{thread_id}" keys.
 */
export class RedisSaver extends BaseCheckpointSaver {
  private client: Redis;

  constructor(client: Redis) {
    super();
    this.client = client;
  }

  /**
   * Retrieve the latest state for a given thread
   */
  async getTuple(config: any): Promise<CheckpointTuple | undefined> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return undefined;

    try {
      const raw = await this.client.get(`checkpoint:${threadId}`);
      if (!raw) return undefined;

      const data = JSON.parse(raw);

      // Rehydrate the state
      return {
        config,
        checkpoint: data.checkpoint,
        metadata: data.metadata,
        parentConfig: data.parentConfig,
      };
    } catch (error) {
      console.error("RedisSaver Get Error:", error);
      return undefined;
    }
  }

  /**
   * List history (Not strictly needed for Resume, but required by interface)
   */
  async *list(config: any, options?: any): AsyncGenerator<CheckpointTuple> {
    // Simple implementation: Just return the current head if it matches
    const tuple = await this.getTuple(config);
    if (tuple) {
      yield tuple;
    }
  }

  /**
   * Save the state to Redis
   */
  async put(
    config: any,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata,
  ): Promise<any> {
    const threadId = config.configurable?.thread_id;
    if (!threadId) return;

    const key = `checkpoint:${threadId}`;

    const data = {
      checkpoint,
      metadata,
      parentConfig: config,
    };

    // Store with 24h expiry (clean up old states automatically)
    await this.client.setex(key, 86400, JSON.stringify(data));

    return { configurable: { thread_id: threadId } };
  }

  /**
   * Save writes to Redis (required by interface)
   */
  async putWrites(
    config: any,
    writes: Array<[string, any]>,
    appId: string,
  ): Promise<void> {
    // Implementation for storing writes if needed
  }

  /**
   * Delete a thread and its checkpoints (required by interface)
   */
  async deleteThread(threadId: string): Promise<void> {
    const key = `checkpoint:${threadId}`;
    await this.client.del(key);
  }
}
