import React, { useState, useEffect } from "react";
import { useEdgeAI } from "../../hooks/useEdgeAI";

export const SmartEditor = () => {
  const [text, setText] = useState("");
  const { runTask, result, status, progress } = useEdgeAI();

  // Auto-update text when AI finishes
  useEffect(() => {
    if (result) setText(result);
  }, [result]);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Module Description
      </label>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-3 border rounded-md focus:ring-2 focus:ring-blue-500"
        rows={4}
        placeholder="Type a rough draft here (e.g., 'this module about react hooks is good for knowing state')..."
      />

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => runTask(text, "polish")}
          disabled={status !== "idle" || !text}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
        >
          {status === "processing" ? "✨ Polishing..." : "✨ Magic Polish"}
        </button>

        {status === "loading_model" && (
          <span className="text-xs text-gray-500">
            Downloading AI Engine: {Math.round(progress)}%
          </span>
        )}
      </div>
    </div>
  );
};
