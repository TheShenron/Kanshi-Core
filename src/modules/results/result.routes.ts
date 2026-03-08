import { Router } from "express";
import { deleteExam, getMyExamResultByExamId, getUserExamResultByExamId, getMyExamResult, getUserExamResult, startMyExam, submitMyExam, getExamResult, updateExamResult } from "./result.controller";
import { allowRoles, verifyToken } from "../../middlewares/verify-token";
import { validateReq } from "../../middlewares/validate-req";
import { startExamSchema, submitExamSchema, deleteExamxamSchema, getExamResultSchema, getExamResultByExamIdSchema, getResultSchema, updateResultSchema } from "./result.validator";
import proctoringRoutes from "../proctoring/proctor.routes";
import { ADMIN, CANDIDATE, HR } from "../../shared/constants/enums";
import { upload } from "../../config/multer";

const router = Router();

// proctoring routes
router.use("/", proctoringRoutes);

router.post("/me/start", verifyToken, validateReq({ body: startExamSchema }), allowRoles(ADMIN, CANDIDATE), startMyExam);
router.post("/me/submit", verifyToken, upload.single('resultZipFile'), validateReq({ body: submitExamSchema }), allowRoles(ADMIN, CANDIDATE), submitMyExam);
// router.delete("/:examId/:hiringDriveId/delete", verifyToken, validateReq({ params: deleteExamxamSchema }), allowRoles(ADMIN), deleteExam);
// router.get("/:examId/:hiringDriveId/:userId/get-by-exam", verifyToken, validateReq({ params: getExamResultByExamIdSchema }), allowRoles(ADMIN, HR), getUserExamResultByExamId);
// router.get("/me/:examId/:hiringDriveId/get-by-exam", verifyToken, validateReq({ params: getExamResultByExamIdSchema }), allowRoles(ADMIN, HR), getMyExamResultByExamId);
router.get("/get/:resultId", validateReq({ params: getResultSchema }), getExamResult);
router.put("/update/result", validateReq({ body: updateResultSchema }), updateExamResult);
// router.get("/get/:hiringDriveId/:userId", verifyToken, validateReq({ params: getExamResultSchema }), allowRoles(ADMIN, HR), getUserExamResult);

export default router;
