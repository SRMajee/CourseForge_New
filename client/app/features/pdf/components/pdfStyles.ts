import { StyleSheet, Font } from "@react-pdf/renderer";

// 1. Register Fonts
// We register Roboto to ensure consistent rendering across all devices/OS
Font.register({
  family: "Roboto",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
});
Font.register({
  family: "RobotoBold",
  src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
});

// 2. Define Styles
export const styles = StyleSheet.create({
  // --- General Page Layout ---
  tocModuleContainer: {
    marginBottom: 12,
    paddingLeft: 0,
  },


  page: {
    padding: 40,
    fontFamily: "Roboto",
    fontSize: 12,
    color: "#2d3748",
    lineHeight: 1.5,
  },
  coverPage: {
    padding: 40,
    fontFamily: "Roboto",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    backgroundColor: "#ffffff",
  },

  // --- Headers & Titles ---
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#3182ce",
    paddingBottom: 10,
  },
  subHeader: {
    fontSize: 10,
    color: "#718096",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontFamily: "RobotoBold",
    color: "#2c5282",
  },
  moduleTitle: {
    fontSize: 32,
    fontFamily: "RobotoBold",
    color: "#2c5282",
    textAlign: "center",
    marginBottom: 20,
  },
  moduleDesc: {
    fontSize: 14,
    color: "#718096",
    textAlign: "center",
    marginBottom: 40,
    maxWidth: "80%",
  },
  lessonTitle: {
    fontSize: 24,
    fontFamily: "RobotoBold",
    color: "#2b6cb0",
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#3182ce",
    paddingBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "RobotoBold",
    color: "#2b6cb0",
    marginTop: 20,
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  // --- Content ---
  paragraph: {
    marginBottom: 10,
    textAlign: "justify",
    color: "#4a5568",
  },
  tocItem: {
    fontSize: 14,
    marginBottom: 10,
    color: "#2d3748",
    borderBottomWidth: 1,
    borderBottomColor: "#edf2f7",
    paddingBottom: 5,
  },

  // --- Components ---
  codeBlock: {
    backgroundColor: "#1a202c",
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
  },
  codeText: {
    fontFamily: "Courier",
    fontSize: 10,
    color: "#e2e8f0",
  },
  terminalOutput: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#4a5568",
    paddingTop: 8,
  },
  terminalLabel: {
    color: "#68d391",
    fontSize: 8,
    fontFamily: "Courier",
    marginBottom: 2,
  },
  linkCard: {
    backgroundColor: "#ebf8ff",
    borderWidth: 1,
    borderColor: "#bee3f8",
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
  },
  videoCard: {
    flexDirection: "row",
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
    gap: 10,
  },
  videoThumbnail: {
    width: 120,
    height: 68,
    borderRadius: 4,
    backgroundColor: "#ddd",
    objectFit: "cover",
  },
  quizBox: {
    backgroundColor: "#fffaf0",
    borderWidth: 1,
    borderColor: "#dd6b20",
    padding: 15,
    borderRadius: 4,
    marginBottom: 15,
  },
  quizQuestion: {
    fontFamily: "RobotoBold",
    color: "#c05621",
    marginBottom: 8,
  },
  quizOption: {
    fontSize: 11,
    marginBottom: 4,
    padding: 4,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#edf2f7",
  },
  correctAnswer: {
    marginTop: 8,
    fontSize: 10,
    color: "#2f855a",
    fontFamily: "RobotoBold",
  },

  // --- Footer ---
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    textAlign: "center",
    fontSize: 9,
    color: "#cbd5e0",
    borderTopWidth: 1,
    borderTopColor: "#edf2f7",
    paddingTop: 10,
  },
  // Add these to your existing StyleSheet.create({ ... })

  // --- Course Specific ---
  courseTitle: {
    fontSize: 36,
    fontFamily: "RobotoBold",
    color: "#2a4365", // Darker blue
    textAlign: "center",
    marginBottom: 20,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  courseStats: {
    fontSize: 12,
    color: "#718096",
    textAlign: "center",
    marginBottom: 60,
  },

  // --- Hierarchy / TOC ---
  tocModuleTitle: {
    fontSize: 16,
    fontFamily: "RobotoBold",
    color: "#2b6cb0",
    marginTop: 15,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tocLessonItem: {
    fontSize: 12,
    color: "#4a5568",
    marginLeft: 15,
    marginBottom: 3,
  },

  // --- Module Section Break ---
  moduleCoverPage: {
    padding: 40,
    fontFamily: "Roboto",
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    backgroundColor: "#ebf8ff", // Light blue background for module separators
  },
  moduleCoverTitle: {
    fontSize: 28,
    fontFamily: "RobotoBold",
    color: "#2c5282",
    textAlign: "center",
  },
});
