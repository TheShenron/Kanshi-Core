import { questionConfigSchema } from "../../modules/exams/exam.validator";

export const validateQuestion = (data: unknown) => {
    const parsed = questionConfigSchema.safeParse(data);

    if (!parsed.success) {
        const errors = parsed.error.issues.map(
            (err) => `${err.path.join(".")} - ${err.message}`
        );

        throw new Error("Invalid question.json:\n" + errors.join("\n"));
    }

    return parsed.data;
};