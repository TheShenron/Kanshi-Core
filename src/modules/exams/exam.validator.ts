import { z } from "zod";
import { objectIdSchema } from "../hiring-drives/hiringDrive.validator";

export const createExamSchema = z.object({
    title: z.string().min(2, "Title is required").trim(),

    description: z.string().trim().optional(),

    difficulty: z.enum(["easy", "medium", "hard"], {
        message: "Difficulty is required",
    }),

    duration: z.coerce
        .number()
        .min(1, "Duration must be at least 1 minute")
        .max(180, "Duration cannot be more than 180 minutes"),

    isActive: z.coerce.boolean().default(true),

    examRepoLink: z.url("Invalid URL format"),
});

export const deleteExamSchema = z.object({
    id: objectIdSchema,
});

export const updateExamSchema = z.object({
    title: z.string().min(2).trim().optional(),

    description: z.string().trim().optional(),

    difficulty: z.enum(["easy", "medium", "hard"]).optional(),

    duration: z.coerce.number().min(1).max(180).optional(),

    isActive: z.coerce.boolean().default(true),

    examRepoLink: z.url("Invalid URL format").optional(),

});
