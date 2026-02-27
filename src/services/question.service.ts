// src/services/question.service.ts

import fs from "node:fs";
import path from "node:path";

export const readQuestionConfig = async (repoPath: string) => {
    const configPath = path.join(repoPath, "question.json");

    if (!fs.existsSync(configPath)) {
        throw new Error("question.json not found in repository");
    }

    const file = fs.readFileSync(configPath, "utf-8");

    return JSON.parse(file);
};