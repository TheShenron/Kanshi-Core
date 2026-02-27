import { Request, Response } from "express";
import { Exam } from "./exam.model";
import { StatusCodes } from "http-status-codes";
import { cloneRepo } from "../../services/git.service";
import { readQuestionConfig } from "../../services/question.service";
import { validateQuestion } from "../../shared/utils/validateQuestion";
import fs from "node:fs/promises";
import { Types } from "mongoose";

export const createExam = async (req: Request, res: Response) => {
    let repoPath: string | null = null;

    try {
        const { examRepoLink, releaseUrl, isActive = true } = req.body;

        repoPath = await cloneRepo(examRepoLink);

        const questionConfig = await readQuestionConfig(repoPath);

        const validatedQuestionConfig = validateQuestion(questionConfig);

        const exam = await Exam.create({
            examId: validatedQuestionConfig.examId,
            title: validatedQuestionConfig.title,
            description: validatedQuestionConfig.description,
            difficulty: validatedQuestionConfig.difficulty,
            duration: validatedQuestionConfig.duration,
            language: validatedQuestionConfig.language,
            entry: validatedQuestionConfig.entry,
            editableFolders: validatedQuestionConfig.editableFolders,
            excludeOnSubmit: validatedQuestionConfig.excludeOnSubmit,
            installCommand: validatedQuestionConfig.installCommand,
            runCommand: validatedQuestionConfig.runCommand,
            testCommand: validatedQuestionConfig.testCommand,
            examRepoLink,
            releaseUrl,
            isActive,
            createdBy: req.user?.id,
            updatedBy: req.user?.id,
        });

        res.json({ success: true, data: exam });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    } finally {
        if (repoPath) {
            await fs.rm(repoPath, { recursive: true, force: true });
        }
    }
};

export const updateExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { examRepoLink, releaseUrl, isActive } = req.body;
    const userId = req.user!.id;

    let repoPath: string | null = null;

    try {
        const exam = await Exam.findOne({ _id: id, deletedAt: null });

        if (!exam) {
            return res.status(404).json({
                success: false,
                message: "Exam not found",
            });
        }

        if (examRepoLink) {

            repoPath = await cloneRepo(examRepoLink);

            const rawConfig = await readQuestionConfig(repoPath);

            const questionConfig = validateQuestion(rawConfig);
            exam.examId = questionConfig.examId;
            exam.title = questionConfig.title;
            exam.description = questionConfig.description;
            exam.difficulty = questionConfig.difficulty;
            exam.duration = questionConfig.duration;
            exam.language = questionConfig.language;
            exam.entry = questionConfig.entry;
            exam.editableFolders = questionConfig.editableFolders;
            exam.excludeOnSubmit = questionConfig.excludeOnSubmit;
            exam.installCommand = questionConfig.installCommand;
            exam.runCommand = questionConfig.runCommand;
            exam.testCommand = questionConfig.testCommand;
            exam.examRepoLink = examRepoLink;
        }

        if (isActive !== undefined && isActive !== null) {
            exam.isActive = isActive;
        }

        if (releaseUrl) {
            exam.releaseUrl = releaseUrl;
        }

        exam.updatedBy = new Types.ObjectId(userId);

        await exam.save();

        res.json({ success: true, data: exam });

    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message,
        });
    } finally {
        if (repoPath) {
            await fs.rm(repoPath, { recursive: true, force: true });
        }
    }
};

export const deleteExam = async (req: Request, res: Response) => {
    const { id } = req.params;
    const userId = req.user?.id;

    const exam = await Exam.findOneAndUpdate(
        { _id: id, deletedAt: null },
        {
            deletedAt: new Date(),
            isActive: false,
            updatedBy: userId
        },
        { returnDocument: "after" }
    );

    if (!exam) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Exam not found"
        });
    }

    res.json({
        success: true,
        message: "Exam deleted successfully"
    });
};

export const getAllExams = async (req: Request, res: Response) => {
    const exams = await Exam.find({
        deletedAt: null
    })
        .populate("createdBy", "name email")
        .populate("updatedBy", "name email")
        .sort({ createdAt: -1 });


    res.json({
        success: true,
        count: exams.length,
        data: exams
    });
};
