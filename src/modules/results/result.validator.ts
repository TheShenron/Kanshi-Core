import z from "zod";
import { objectIdSchema } from "../hiring-drives/hiringDrive.validator";

export const startExamSchema = z.object({
    examId: objectIdSchema,
    hiringDriveId: objectIdSchema,
});

export const submitExamSchema = z.object({
    examId: objectIdSchema,
    hiringDriveId: objectIdSchema,
});


export const deleteExamxamSchema = z.object({
    examId: objectIdSchema,
    hiringDriveId: objectIdSchema
});

export const getExamResultByExamIdSchema = z.object({
    examId: objectIdSchema,
    hiringDriveId: objectIdSchema
});

export const getExamResultSchema = z.object({
    hiringDriveId: objectIdSchema,
    userId: objectIdSchema
});

export const getResultSchema = z.object({
    resultId: objectIdSchema
});

export const updateResultSchema = z.object({
    resultId: objectIdSchema,
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
});



