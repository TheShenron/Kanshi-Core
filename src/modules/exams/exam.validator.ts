import { z } from "zod";
import { objectIdSchema } from "../hiring-drives/hiringDrive.validator";

export const createExamSchema = z.object({
    isActive: z.coerce.boolean().default(true),
    releaseUrl: z.url("Invalid URL format"),
    examRepoLink: z.url("Invalid URL format"),
});

export const questionConfigSchema = z.object({
    examId: z.string().min(3),

    title: z.string().min(2),

    description: z.string().optional(),

    difficulty: z.enum(["easy", "medium", "hard"]),

    duration: z.coerce
        .number()
        .min(1)
        .max(180),

    language: z.enum([
        "react",
        "javascript",
        "typescript",
        "node",
        "python",
        "java",
        "c",
        "cpp",
        "embedded-c"
    ]),

    entry: z.string().min(1).refine(
        (val) => !val.includes(".."),
        "Entry file cannot contain path traversal"
    ),

    editableFolders: z.array(z.string()).min(1),

    excludeOnSubmit: z.array(z.string()).default([]),

    installCommand: z.string().min(1),

    runCommand: z.string().min(1),

    testCommand: z.string().min(1),
});

export const deleteExamSchema = z.object({
    id: objectIdSchema,
});

export const updateExamSchema = z.object({
    isActive: z.coerce.boolean().default(true),
    examRepoLink: z.url("Invalid URL format").optional(),
    releaseUrl: z.url("Invalid URL format").optional(),
});
