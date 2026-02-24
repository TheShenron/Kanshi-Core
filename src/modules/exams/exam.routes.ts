import { Router } from "express";
import { createExam, deleteExam, getAllExams, updateExam } from "./exam.controller";
import { allowRoles, verifyToken } from "../../middlewares/verify-token";
import { validateReq } from "../../middlewares/validate-req";
import { createExamSchema, deleteExamSchema, updateExamSchema } from "./exam.validator";
import { ADMIN, HR } from "../../shared/constants/enums";

const router = Router();

router.post("/", verifyToken, validateReq({ body: createExamSchema }), allowRoles(ADMIN), createExam);
router.get("/", verifyToken, allowRoles(ADMIN, HR), getAllExams);
router.put("/:id", verifyToken, validateReq({ body: updateExamSchema }), allowRoles(ADMIN), updateExam);
router.delete("/:id", verifyToken, validateReq({ params: deleteExamSchema }), allowRoles(ADMIN), deleteExam);

export default router;
