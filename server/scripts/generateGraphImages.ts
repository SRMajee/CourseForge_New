import fs from "fs/promises";
import { courseGraph } from "../src/ai/graphs/courseGraph"; // update path if needed
import { lessonGraph } from "../src/ai/graphs/lessonGraph"; // update path if needed

async function generatePng() {
  try {
    const courseImageBlob = await courseGraph.getGraph().drawMermaidPng();
    const courseBuffer = Buffer.from(await courseImageBlob.arrayBuffer());
    await fs.writeFile("courseGraph.png", courseBuffer);
    console.log("✅ Successfully saved courseGraph.png");

    const lessonImageBlob = await lessonGraph.getGraph().drawMermaidPng();
    const lessonBuffer = Buffer.from(await lessonImageBlob.arrayBuffer());
    await fs.writeFile("lessonGraph.png", lessonBuffer);
    console.log("✅ Successfully saved lessonGraph.png");

  } catch (error) {
    console.error("Error generating graph images:", error);
  } finally {
    // Force the script to exit, killing the lingering Redis retry loop
    process.exit(0);
  }
}

generatePng();