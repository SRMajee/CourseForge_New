import { Router } from "express";
import { searchVideo } from "../controllers/mediaController";
import { generateLessonAudio } from "../controllers/mediaController";
const router = Router();

// TEMPORARY: Comment out checkJwt for easier testing
// GET /api/v1/media/youtube?q=...
router.get("/youtube", searchVideo);
router.post("/audio/:lessonId", generateLessonAudio);
export default router;
