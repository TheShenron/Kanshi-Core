import { Request, Response } from "express";
import { Result } from "./result.model";
import { DateTime } from "luxon";
import { StatusCodes } from "http-status-codes";
import { Exam } from "../exams/exam.model";
import { HiringDrive } from "../hiring-drives/hiringDrive.model";
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET as string;

export const startMyExam = async (req: Request, res: Response) => {
    const { examId, hiringDriveId } = req.body;
    const userId = req.user?.id;
    const userEmail = req.user?.email;
    const userRole = req.user?.role;

    // 1) validate exam exists
    const exam = await Exam.findOne({ _id: examId, deletedAt: null }).select(
        "duration"
    );

    if (!exam) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Exam not found",
        });
    }

    // 2) validate hiring drive exists + user is candidate + exam belongs to drive
    const drive = await HiringDrive.findOne({
        _id: hiringDriveId,
        deletedAt: null,
        "candidates.userId": userId,
        exams: examId,
    }).select("startsAt endsAt isActive candidates passingMarks");

    if (!drive) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message:
                "Hiring drive not found OR you are not registered OR exam not in drive",
        });
    }

    // 3) drive active + time checks
    const now = DateTime.utc();

    if (!drive.isActive) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Hiring drive is not active",
        });
    }

    if (now < DateTime.fromJSDate(drive.startsAt).toUTC()) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Hiring drive not started yet",
        });
    }

    if (now > DateTime.fromJSDate(drive.endsAt).toUTC()) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Hiring drive already ended",
        });
    }

    // 4) find candidate from drive
    const candidate = drive.candidates.find(
        (c) => c.userId.toString() === userId
    );

    if (!candidate) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not registered for this hiring drive",
        });
    }

    // 5) enforce attempt limit
    if (candidate.attemptsUsed >= candidate.maxAttempts!) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: `Attempt limit reached. Max allowed: ${candidate.maxAttempts}`,
        });
    }

    // 6) check active attempt
    const activeAttempt = await Result.findOne({
        userId,
        examId,
        hiringDriveId,
        submittedAt: null,
        status: "started",
    });

    if (activeAttempt) {
        const startedAt = DateTime.fromJSDate(activeAttempt.startedAt!).toUTC();
        const deadline = startedAt.plus({ minutes: exam.duration + 5 });

        // if expired, mark expired and allow new attempt
        if (now > deadline) {
            activeAttempt.status = "expired";
            activeAttempt.submittedAt = deadline.toJSDate();
            activeAttempt.durationTaken = Math.floor(
                deadline.diff(startedAt, "seconds").seconds
            );
            activeAttempt.score = 0;
            activeAttempt.isPassed = false;

            await activeAttempt.save();
        } else {
            return res.status(StatusCodes.BAD_REQUEST).json({
                success: false,
                message: "You already have an active attempt for this exam",
            });
        }
    }

    // 7) next attempt number
    const lastAttempt = await Result.findOne({
        userId,
        examId,
        hiringDriveId,
    }).sort({ attemptNo: -1 });

    const attemptNo = lastAttempt ? lastAttempt.attemptNo + 1 : 1;

    // 8) create attempt
    const result = await Result.create({
        userId,
        examId,
        hiringDriveId,
        attemptNo,
        startedAt: now.toJSDate(),
        submittedAt: null,
        status: "started",
        score: 0,
        isPassed: false,
    });

    // 9) increment attemptsUsed ONLY after successful attempt creation
    await HiringDrive.updateOne(
        { _id: hiringDriveId, "candidates.userId": userId },
        { $inc: { "candidates.$.attemptsUsed": 1 } }
    );

    // generate exam token (exam duration + 5 min buffer)
    const bufferMinutes = 10;
    const totalMinutes = exam.duration + bufferMinutes;

    const examToken = jwt.sign(
        { id: String(userId), email: userEmail, role: userRole },
        JWT_SECRET,
        {
            expiresIn: totalMinutes * 60,
        }
    );

    return res.json({
        success: true,
        message: "Exam started successfully",
        data: { result, examToken },
    });
};

export const submitMyExam = async (req: Request, res: Response) => {

    if (!req.file?.buffer) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Result zip file is required.",
        });
    }

    // ✅ file size validation (max 2MB)
    const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

    if (req.file.size > MAX_FILE_SIZE) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "File size exceeds 2MB limit.",
        });
    }


    const { examId, hiringDriveId, score } = req.body;
    const userId = req.user?.id;

    // 1) validate exam exists
    const exam = await Exam.findOne({ _id: examId, deletedAt: null }).select(
        "duration"
    );

    if (!exam) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Exam not found",
        });
    }

    // 2) validate hiring drive exists + user is candidate + exam belongs to drive
    const drive = await HiringDrive.findOne({
        _id: hiringDriveId,
        deletedAt: null,
        "candidates.userId": userId,
        exams: examId,
    }).select("startsAt endsAt isActive passingMarks");

    if (!drive) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message:
                "Hiring drive not found OR you are not registered OR exam not in drive",
        });
    }

    // 3) find active attempt
    const attempt = await Result.findOne({
        userId,
        examId,
        hiringDriveId,
        submittedAt: null,
        status: "started",
    });

    if (!attempt) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Active exam attempt not found",
        });
    }

    if (!attempt.startedAt) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid attempt: startedAt missing",
        });
    }

    // 4) validate time
    const now = DateTime.utc();
    const startedAt = DateTime.fromJSDate(attempt.startedAt).toUTC();
    const deadline = startedAt.plus({ minutes: exam.duration + 5 });

    if (now > deadline) {
        // mark expired
        attempt.status = "expired";
        attempt.submittedAt = deadline.toJSDate();
        attempt.durationTaken = Math.floor(
            deadline.diff(startedAt, "seconds").seconds
        );
        attempt.score = 0;
        attempt.isPassed = false;

        await attempt.save();

        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "Time is over. Attempt expired.",
        });
    }

    // 5) submit normally
    attempt.score = score;
    attempt.isPassed = score >= Number(drive.passingMarks);
    attempt.submittedAt = now.toJSDate();
    attempt.durationTaken = Math.floor(now.diff(startedAt, "seconds").seconds);
    attempt.status = "submitted";
    attempt.resultZipFile = req.file.buffer

    await attempt.save();

    return res.json({
        success: true,
        message: "Exam submitted successfully",
        data: attempt,
    });
};

export const deleteExam = async (req: Request, res: Response) => {
    const { examId, hiringDriveId } = req.params;
    const userId = req.user?.id;

    const deleted = await Result.findOneAndDelete({ examId, userId, hiringDriveId });

    if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: "Result not found" });
    }

    res.json({ success: true, message: "Exam deleted successfully", data: deleted });
};

export const getMyExamResultByExamId = async (req: Request, res: Response) => {
    const { examId, hiringDriveId } = req.params;
    const userId = req.user?.id

    const result = await Result.findOne({ examId, userId, hiringDriveId });

    if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Result not found"
        });
    }

    res.json({ success: true, data: result });
};

export const getUserExamResultByExamId = async (req: Request, res: Response) => {
    const { examId, hiringDriveId, userId } = req.params;

    const result = await Result.findOne({ examId, userId, hiringDriveId });

    if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Result not found"
        });
    }

    res.json({ success: true, data: result });
};

export const getMyExamResult = async (req: Request, res: Response) => {
    const { hiringDriveId } = req.params;
    const userId = req.user?.id

    const result = await Result.find({ userId, hiringDriveId });

    if (result.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Result not found"
        });
    }

    res.json({ success: true, data: result });
};

export const getUserExamResult = async (req: Request, res: Response) => {
    const { hiringDriveId, userId } = req.params;
    const result = await Result.find({ userId, hiringDriveId });

    if (result.length === 0) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Result not found"
        });
    }

    res.json({ success: true, data: result });
};
