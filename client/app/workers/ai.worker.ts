import { pipeline, env } from "@xenova/transformers";

// Skip local model checks (we fetch from Hugging Face Hub)
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton to hold the pipeline
class EdgePipeline {
  static task = "text2text-generation";
  static model = "Xenova/LaMini-Flan-T5-78M";
  static instance: any = null;

  static async getInstance(progress_callback: Function) {
    if (this.instance === null) {
      this.instance = await pipeline(this.task, this.model, {
        progress_callback,
      });
    }
    return this.instance;
  }
}

// Listen for messages from React
self.addEventListener("message", async (event) => {
  const { text, action } = event.data;

  try {
    const generator = await EdgePipeline.getInstance((data: any) => {
      // Send loading progress back to UI (e.g., "Loading Model: 50%")
      self.postMessage({ status: "loading", data });
    });

    // Define Prompts for different actions
    let prompt = "";
    if (action === "polish")
      prompt = `Fix grammar and improve clarity: ${text}`;
    if (action === "summarize")
      prompt = `Summarize this in one sentence: ${text}`;
    if (action === "tags") prompt = `Generate 3 relevant tags for: ${text}`;

    // Run Inference
    const output = await generator(prompt, {
      max_new_tokens: 100,
      temperature: 0.7,
    });

    // Send result back
    self.postMessage({ status: "complete", output: output[0].generated_text });
  } catch (error) {
    self.postMessage({ status: "error", error: error });
  }
});
