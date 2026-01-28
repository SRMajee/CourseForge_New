import { useState, useEffect, useRef, useCallback } from "react";

export function useEdgeAI() {
  const [result, setResult] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading_model" | "processing" | "ready">("idle");
  const [progress, setProgress] = useState<number>(0);
  
  const worker = useRef<Worker | null>(null);

  useEffect(() => {
    // Initialize Worker
    worker.current = new Worker(new URL("../workers/ai.worker.ts", import.meta.url), {
      type: "module",
    });

    // Handle Worker Responses
    worker.current.onmessage = (event) => {
      const { status, data, output } = event.data;

      if (status === "loading") {
        setStatus("loading_model");
        setProgress(data.progress || 0); // Model download progress
      }
      
      if (status === "complete") {
        setStatus("idle");
        setResult(output);
      }
    };

    return () => worker.current?.terminate();
  }, []);

  const runTask = useCallback((text: string, action: "polish" | "summarize" | "tags") => {
    if (!worker.current) return;
    setStatus("processing");
    worker.current.postMessage({ text, action });
  }, []);

  return { runTask, result, status, progress };
}