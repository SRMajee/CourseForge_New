import { Button } from "@chakra-ui/react";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaDownload } from "react-icons/fa";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface LessonPDFExporterProps {
  lesson: any;
  lessonTitle?: string;
  videoThumbnail?: string;
  videoTitle?: string;
  videoUrl?: string;
}

export const LessonPDFExporter = ({
  lesson,
  lessonTitle,
  videoThumbnail,
  videoTitle,
  videoUrl,
}: LessonPDFExporterProps) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!printRef.current) return;
    setIsDownloading(true);

    try {
      const element = printRef.current;

      // 1. Wait for images to render
      await new Promise((resolve) => setTimeout(resolve, 800));

      // -----------------------------------------------------------------------
      // STEP 1: PRECISE PAGE BREAK ALGORITHM
      // -----------------------------------------------------------------------
      const PAGE_HEIGHT = 1122;
      const MARGIN_BOTTOM = 40;

      element.querySelectorAll(".pdf-spacer").forEach((el) => el.remove());

      const blocks = Array.from(element.querySelectorAll(".pdf-block"));
      let currentY = 0;

      blocks.forEach((block) => {
        const el = block as HTMLElement;
        const h = el.offsetHeight;
        const positionOnPage = currentY % PAGE_HEIGHT;

        if (positionOnPage + h > PAGE_HEIGHT - MARGIN_BOTTOM) {
          const spaceNeeded = PAGE_HEIGHT - positionOnPage;
          const spacer = document.createElement("div");
          spacer.className = "pdf-spacer";
          spacer.style.height = `${spaceNeeded}px`;
          spacer.style.display = "block";
          spacer.style.width = "100%";
          el.parentNode?.insertBefore(spacer, el);
          currentY += spaceNeeded + h;
        } else {
          currentY += h;
        }
      });
      // -----------------------------------------------------------------------

      // 2. Capture Canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        windowWidth: 794,
        onclone: (clonedDoc) => {
          const container = clonedDoc.getElementById("pdf-container");
          if (container) {
            container.style.color = "#000000";
          }
        },
      });

      // 3. Generate PDF
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfW = 210;
      const pdfH = 297;
      const domToPdfRatio = 210 / 794;

      const imgHeight = (canvas.height * pdfW) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      const imgData = canvas.toDataURL("image/png");

      pdf.addImage(imgData, "PNG", 0, position, pdfW, imgHeight);

      // --- ADD LINKS ---
      const addLinks = () => {
        const triggers = element.querySelectorAll(".pdf-link-trigger");
        const containerRect = element.getBoundingClientRect();

        triggers.forEach((trig) => {
          const el = trig as HTMLElement;
          const url = el.getAttribute("data-url");
          if (!url) return;

          const rect = el.getBoundingClientRect();
          const topRel = rect.top - containerRect.top;
          const leftRel = rect.left - containerRect.left;

          const pageIndex = Math.floor(topRel / PAGE_HEIGHT);
          const yOnPagePx = topRel % PAGE_HEIGHT;

          const x = leftRel * domToPdfRatio;
          const y = yOnPagePx * domToPdfRatio;
          const w = rect.width * domToPdfRatio;
          const h = rect.height * domToPdfRatio;

          pdf.setPage(pageIndex + 1);
          pdf.link(x, y, w, h, { url });
        });
      };

      addLinks();

      if (videoUrl) {
        pdf.setPage(1);
        pdf.link(15, 45, 180, 30, { url: videoUrl });
      }

      heightLeft -= pdfH;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfW, imgHeight);
        heightLeft -= pdfH;
      }

      const safeTitle = (lesson.title || "Lesson").replace(/\s+/g, "_");
      pdf.save(`${safeTitle}.pdf`);

      element.querySelectorAll(".pdf-spacer").forEach((el) => el.remove());
    } catch (error: any) {
      console.error("PDF Generation failed:", error);
      alert(`PDF Error: ${error.message}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const getText = (content: any): string => {
    if (!content) return "";
    if (typeof content === "string") return content;
    if (Array.isArray(content)) return content.map((c) => getText(c)).join("");
    if (typeof content === "object") {
      return (
        content.text ||
        content.value ||
        getText(content.content) ||
        getText(content.children) ||
        ""
      );
    }
    return "";
  };

  // --- RENDERER ---
  const renderSafeContent = (blocks: any[]) => {
    if (!Array.isArray(blocks)) return null;

    return blocks.map((block, index) => {
      const blockText = getText(block);
      const blockClass = "pdf-block";

      // 1. HEADINGS
      if (
        block.type === "heading" ||
        (block.tag && block.tag.startsWith("h"))
      ) {
        return (
          <div key={index} className={blockClass}>
            <h3
              style={{
                color: "#2b6cb0",
                marginTop: "30px",
                marginBottom: "15px",
                fontSize: "22px",
                fontWeight: "bold",
                borderBottom: "2px solid #e2e8f0",
                paddingBottom: "8px",
                fontFamily: "Arial, sans-serif",
              }}
            >
              {blockText || "Section"}
            </h3>
          </div>
        );
      }

      // 2. VIDEO RESOURCES
      if (block.type === "video") {
        const query = block.query || block.text || "Django Tutorial";
        const youtubeUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

        return (
          <div
            key={index}
            className={`${blockClass} pdf-link-trigger`}
            data-url={youtubeUrl}
            style={{ marginBottom: "20px" }}
          >
            <div
              style={{
                border: "1px solid #e2e8f0",
                backgroundColor: "#ffffff",
                padding: "15px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                gap: "15px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  width: "40px",
                  height: "40px",
                  borderRadius: "50%",
                  backgroundColor: "#c53030",
                  color: "white",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                ▶
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: "bold",
                    fontSize: "14px",
                    color: "#2d3748",
                    margin: "0 0 4px 0",
                  }}
                >
                  Watch on YouTube
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#718096" }}>
                  Search: "{query}"
                </p>
                <a
                  href={youtubeUrl}
                  style={{
                    color: "#3182ce",
                    fontSize: "11px",
                    textDecoration: "underline",
                    display: "block",
                    marginTop: "4px",
                    wordBreak: "break-all",
                  }}
                >
                  {youtubeUrl}
                </a>
              </div>
            </div>
          </div>
        );
      }

      // 3. READING LINKS (NEW) 👈
      if (block.type === "link") {
        return (
          <div
            key={index}
            className={`${blockClass} pdf-link-trigger`}
            data-url={block.url}
            style={{ marginBottom: "20px" }}
          >
            <div
              style={{
                border: "1px solid #bee3f8", // Blue-200
                backgroundColor: "#ebf8ff", // Blue-50
                padding: "15px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "flex-start",
                gap: "15px",
                cursor: "pointer",
              }}
            >
              {/* Icon Box */}
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "6px",
                  backgroundColor: "#3182ce", // Blue-500
                  color: "white",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "18px",
                }}
              >
                📖
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontWeight: "bold",
                    fontSize: "14px",
                    color: "#2c5282", // Blue-800
                    margin: "0 0 4px 0",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                  }}
                >
                  {block.title}
                  <span style={{ fontSize: "12px", opacity: 0.7 }}>↗</span>
                </p>
                <p style={{ margin: 0, fontSize: "12px", color: "#4a5568" }}>
                  {block.description}
                </p>
                <a
                  href={block.url}
                  style={{
                    color: "#3182ce",
                    fontSize: "10px",
                    textDecoration: "underline",
                    display: "block",
                    marginTop: "6px",
                    wordBreak: "break-all",
                    opacity: 0.8,
                  }}
                >
                  {block.url}
                </a>
              </div>
            </div>
          </div>
        );
      }

      // 4. CODE BLOCKS
      if (block.type === "code" || block.tag === "code") {
        return (
          <div key={index} className={blockClass}>
            <div
              style={{
                backgroundColor: "#1a202c",
                color: "#e2e8f0",
                border: "1px solid #2d3748",
                padding: "15px",
                borderRadius: "8px",
                marginBottom: "20px",
                fontFamily: '"Courier New", Courier, monospace',
                fontSize: "12px",
                whiteSpace: "pre-wrap",
                overflowX: "hidden",
              }}
            >
              {block.language && (
                <div
                  style={{
                    borderBottom: "1px solid #4a5568",
                    paddingBottom: "5px",
                    marginBottom: "10px",
                    color: "#63b3ed",
                    fontSize: "10px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                  }}
                >
                  {block.language}
                </div>
              )}
              <code>{block.code || blockText}</code>
            </div>
          </div>
        );
      }

      // 5. MCQs
      if (block.type === "quiz" || block.type === "mcq") {
        return (
          <div key={index} className={blockClass}>
            <div
              style={{
                backgroundColor: "#fffaf0",
                border: "1px solid #dd6b20",
                borderRadius: "8px",
                padding: "20px",
                marginBottom: "25px",
              }}
            >
              <p
                style={{
                  fontWeight: "bold",
                  color: "#c05621",
                  marginBottom: "15px",
                  fontSize: "15px",
                }}
              >
                ❓ Quiz: {block.question}
              </p>
              <ul
                style={{
                  listStyleType: "none",
                  padding: 0,
                  margin: "0 0 15px 0",
                }}
              >
                {block.options?.map((opt: string, i: number) => {
                  const isCorrect = opt === block.answer;
                  return (
                    <li
                      key={i}
                      style={{
                        padding: "8px 12px",
                        marginBottom: "6px",
                        backgroundColor: "#ffffff",
                        border: isCorrect
                          ? "2px solid #48bb78"
                          : "1px solid #e2e8f0",
                        borderRadius: "4px",
                        fontSize: "13px",
                        color: "#2d3748",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          marginRight: "10px",
                          fontWeight: "bold",
                          color: "#718096",
                        }}
                      >
                        {["A", "B", "C", "D"][i]}.
                      </span>
                      {opt}
                    </li>
                  );
                })}
              </ul>
              <div
                style={{
                  marginTop: "15px",
                  paddingTop: "15px",
                  borderTop: "1px dashed #dd6b20",
                  fontSize: "13px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 5px 0",
                    color: "#2f855a",
                    fontWeight: "bold",
                  }}
                >
                  ✅ Correct Answer: {block.answer}
                </p>
                {block.explanation && (
                  <p
                    style={{
                      margin: "5px 0 0 0",
                      color: "#4a5568",
                      fontStyle: "italic",
                    }}
                  >
                    💡 Explanation: {block.explanation}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      }

      // 6. LISTS
      if (block.type === "list" || block.type === "bullet_list") {
        const items = block.items || block.content || [];
        return (
          <div key={index} className={blockClass}>
            <ul style={{ paddingLeft: "25px", marginBottom: "15px" }}>
              {Array.isArray(items) &&
                items.map((item: any, i: number) => (
                  <li
                    key={i}
                    style={{
                      marginBottom: "8px",
                      fontSize: "14px",
                      lineHeight: "1.6",
                      color: "#2d3748",
                    }}
                  >
                    {getText(item)}
                  </li>
                ))}
            </ul>
          </div>
        );
      }

      // 7. PARAGRAPHS
      return (
        <div key={index} className={blockClass}>
          <p
            style={{
              marginBottom: "15px",
              lineHeight: "1.7",
              fontSize: "14px",
              color: "#2d3748",
              textAlign: "justify",
            }}
          >
            {blockText}
          </p>
        </div>
      );
    });
  };

  // --- HIDDEN PDF TEMPLATE ---
  const HiddenPdfContent = (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "794px",
        minHeight: "100vh",
        zIndex: -9999,
        opacity: 0,
        backgroundColor: "#ffffff",
        pointerEvents: "none",
      }}
    >
      <div
        ref={printRef}
        id="pdf-container"
        style={{
          backgroundColor: "#ffffff",
          padding: "40px",
          width: "100%",
          height: "100%",
          boxSizing: "border-box",
          fontFamily: "Arial, sans-serif",
          color: "#000000",
        }}
      >
        {/* Header Block */}
        <div
          className="pdf-block"
          style={{
            marginBottom: "30px",
            borderBottom: "4px solid #3182ce",
            paddingBottom: "20px",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "#718096",
              textTransform: "uppercase",
              fontWeight: "bold",
              margin: 0,
              letterSpacing: "1px",
            }}
          >
            {lessonTitle || "CourseForge Lesson"}
          </p>
          <h1
            style={{
              fontSize: "42px",
              color: "#2c5282",
              margin: "10px 0",
              fontWeight: "800",
              lineHeight: "1.2",
            }}
          >
            {lesson.title}
          </h1>

          {/* TOP VIDEO CARD */}
          {videoThumbnail && (
            <div
              className="pdf-link-trigger"
              data-url={videoUrl}
              style={{
                marginTop: "30px",
                padding: "20px",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                display: "flex",
                gap: "25px",
                alignItems: "center",
                backgroundColor: "#f7fafc",
                cursor: "pointer",
              }}
            >
              <img
                src={videoThumbnail}
                alt="Video"
                crossOrigin="anonymous"
                style={{
                  width: "200px",
                  height: "auto",
                  borderRadius: "8px",
                  objectFit: "cover",
                  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    fontWeight: "bold",
                    color: "#4a5568",
                    textTransform: "uppercase",
                  }}
                >
                  Recommended Video Resource
                </p>
                <p
                  style={{
                    margin: "5px 0",
                    fontSize: "20px",
                    fontWeight: "bold",
                    color: "#2d3748",
                  }}
                >
                  {videoTitle || "Lesson Video Tutorial"}
                </p>
                {videoUrl && (
                  <p
                    style={{
                      margin: "8px 0 0 0",
                      fontSize: "14px",
                      color: "#3182ce",
                      textDecoration: "underline",
                      wordBreak: "break-all",
                    }}
                  >
                    {videoUrl}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Objectives Block */}
        {lesson.objectives && lesson.objectives.length > 0 && (
          <div
            className="pdf-block"
            style={{
              marginBottom: "40px",
              padding: "25px",
              backgroundColor: "#ebf8ff",
              borderRadius: "10px",
              borderLeft: "6px solid #3182ce",
            }}
          >
            <h3
              style={{
                fontSize: "16px",
                color: "#2c5282",
                fontWeight: "bold",
                marginTop: 0,
                marginBottom: "15px",
                textTransform: "uppercase",
              }}
            >
              Key Takeaways
            </h3>
            <ul style={{ paddingLeft: "20px", margin: 0 }}>
              {lesson.objectives.map((obj: string, i: number) => (
                <li
                  key={i}
                  style={{
                    marginBottom: "8px",
                    fontSize: "14px",
                    color: "#2d3748",
                  }}
                >
                  {obj}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Content Body */}
        <div className="pdf-content">{renderSafeContent(lesson.content)}</div>

        {/* Footer */}
        <div
          className="pdf-block"
          style={{
            marginTop: "60px",
            borderTop: "1px solid #eee",
            paddingTop: "20px",
            textAlign: "center",
          }}
        >
          <p style={{ fontSize: "12px", color: "#a0aec0" }}>
            Generated by CourseForge AI • {new Date().toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        colorPalette="blue"
        onClick={handleDownload}
        loading={isDownloading}
        loadingText="Exporting..."
      >
        <FaDownload /> Download PDF (-5)
      </Button>
      {createPortal(HiddenPdfContent, document.body)}
    </>
  );
};
