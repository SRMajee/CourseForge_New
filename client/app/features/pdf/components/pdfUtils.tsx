// src/components/pdf/pdfUtils.tsx
import { Text, View, Image, Link } from "@react-pdf/renderer";
import { styles } from "./pdfStyles";

// Helper to strip markdown
const stripMarkdown = (text: string) => {
  if (!text) return "";
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
};

export const renderLessonBlocks = (content: any[]) => {
  if (!content) return null;

  return content.map((block: any, index: number) => {
    // -- HEADING --
    if (block.type === "heading") {
      return (
        <Text key={index} style={styles.sectionTitle}>
          {block.text}
        </Text>
      );
    }

    // -- PARAGRAPH --
    if (block.type === "paragraph") {
      return (
        <Text key={index} style={styles.paragraph}>
          {stripMarkdown(block.text)}
        </Text>
      );
    }

    // -- CODE --
    if (block.type === "code") {
      return (
        <View key={index} style={styles.codeBlock} wrap={false}>
          {block.language && (
            <Text
              style={{
                color: "#a0aec0",
                fontSize: 8,
                marginBottom: 4,
                textTransform: "uppercase",
              }}
            >
              {block.language}
            </Text>
          )}
          <Text style={styles.codeText}>{block.code || block.text}</Text>
          {block.output && (
            <View style={styles.terminalOutput}>
              <Text style={styles.terminalLabel}>&gt; TERMINAL OUTPUT:</Text>
              <Text style={styles.codeText}>{block.output}</Text>
            </View>
          )}
        </View>
      );
    }

    // -- QUIZ / MCQ --
    if (block.type === "mcq" || block.type === "quiz") {
      return (
        <View key={index} style={styles.quizBox} wrap={false}>
          <Text style={styles.quizQuestion}>❓ {block.question}</Text>
          {block.options?.map((opt: string, i: number) => (
            <Text key={i} style={styles.quizOption}>
              {["A", "B", "C", "D"][i]}. {opt}
            </Text>
          ))}
          <Text style={styles.correctAnswer}>✅ Correct: {block.answer}</Text>
          {block.explanation && (
            <Text style={{ fontSize: 10, marginTop: 4, color: "#744210" }}>
              💡 {block.explanation}
            </Text>
          )}
        </View>
      );
    }

    // -- LISTS (Added) --
    if (block.type === "list") {
      const items = block.items || [];
      return (
        <View key={index} style={{ marginBottom: 10, paddingLeft: 10 }}>
          {items.map((item: any, i: number) => (
            <Text key={i} style={{ fontSize: 12, marginBottom: 4 }}>
              • {typeof item === "string" ? item : item.text}
            </Text>
          ))}
        </View>
      );
    }

    // -- VIDEO (Added) --
    if (block.type === "video") {
      return (
        <Link key={index} src={block.url} style={{ textDecoration: "none" }}>
          <View style={styles.videoCard}>
            <View style={{ flex: 1, justifyContent: "center" }}>
              <Text style={{ fontSize: 10, color: "#718096", marginBottom: 2 }}>
                VIDEO RESOURCE
              </Text>
              <Text style={{ fontFamily: "RobotoBold", color: "#2d3748" }}>
                {block.title}
              </Text>
              <Text style={{ fontSize: 9, color: "#3182ce" }}>
                Click to watch on YouTube
              </Text>
            </View>
          </View>
        </Link>
      );
    }

    // -- LINK --
    if (block.type === "link") {
      return (
        <Link key={index} src={block.url} style={{ textDecoration: "none" }}>
          <View style={styles.linkCard}>
            <Text
              style={{
                fontSize: 12,
                fontFamily: "RobotoBold",
                color: "#2b6cb0",
              }}
            >
              📖 {block.title}
            </Text>
            <Text style={{ fontSize: 10, color: "#4a5568" }}>
              {block.description}
            </Text>
          </View>
        </Link>
      );
    }

    return null;
  });
};
