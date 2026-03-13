import simpleGit from "simple-git";
import path from "node:path";
import { nanoid } from "nanoid";
import fs from "node:fs/promises";

export const cloneRepo = async (
    repoUrl: string,
): Promise<string> => {
    const tempDir = path.join(process.cwd(), "temp");

    await fs.mkdir(tempDir, { recursive: true });

    const repoId = nanoid();
    const repoPath = path.join(tempDir, repoId);

    const git = simpleGit({
        timeout: {
            block: 15000,
        },
    });

    try {
        await git.clone(repoUrl, repoPath, ["--depth", "1", "--filter=blob:none"]);

        return repoPath;
    } catch (error) {
        await fs.rm(repoPath, { recursive: true, force: true });
        throw error;
    }
};