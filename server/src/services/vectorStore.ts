import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { OpenAIEmbeddings } from "@langchain/openai";
import mongoose from "mongoose";
import logger from "../utils/logger";

/**
 * Returns a MongoDB Vector Store instance.
 * We use a function to ensure Mongoose is connected before accessing the client.
 */
export const getVectorStore = () => {
  const client = mongoose.connection.getClient();
  const collection = client.db().collection("vectors"); // Ensure this matches your Atlas collection name

  return new MongoDBAtlasVectorSearch(new OpenAIEmbeddings(), {
    collection,
    indexName: "vector_index", // Must match the index name you created in Atlas
    textKey: "text",
    embeddingKey: "embedding",
  });
};

