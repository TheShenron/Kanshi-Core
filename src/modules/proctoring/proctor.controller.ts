import { Request, Response } from "express";
import { ProctorEvent } from "./proctorEvent.model";
import { Result } from "../results/result.model";
import { StatusCodes } from "http-status-codes";

export const addProctoringResult = async (req: Request, res: Response) => {
    // const { resultId } = req.params;
    const resultId = req.params.resultId as string;
    const { events } = req.body;

    const result = await Result.findOne({
        _id: resultId,
        userId: req.user!.id,
    }).select("_id examId hiringDriveId");

    if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Result not found",
        });
    }

    if (result.hiringDriveId == null || result.examId == null) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid result data",
        });
    }

    try {
        const proctoring = await ProctorEvent.create({
            resultId,
            userId: req.user!.id,
            examId: result.examId,
            hiringDriveId: result.hiringDriveId,
            events,
        });

        return res.status(StatusCodes.CREATED).json({
            success: true,
            data: proctoring,
        });
    } catch (err: any) {
        // duplicate key error
        if (err.code === 11000) {
            return res.status(StatusCodes.CONFLICT).json({
                success: false,
                message: "Proctoring data already exists for this result",
            });
        }

        throw err;
    }
};

export const deleteProctoringResult = async (req: Request, res: Response) => {
    const { resultId } = req.params;

    const result = await Result.findOne({
        _id: resultId,
        userId: req.user!.id,
    }).select("_id");

    if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Result not found",
        });
    }

    const deleted = await ProctorEvent.findOneAndDelete({ resultId });

    if (!deleted) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Proctoring data not found",
        });
    }

    return res.status(StatusCodes.OK).json({
        success: true,
        message: "Proctoring data deleted successfully",
    });
};

export const getUserProctoringResult = async (req: Request, res: Response) => {
    const { resultId, userId } = req.params;

    const result = await Result.findOne({
        _id: resultId,
        userId: userId,
    }).select("_id");

    if (!result) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Result not found",
        });
    }

    const proctoring = await ProctorEvent.findOne({ resultId });

    if (!proctoring) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Proctoring data not found",
        });
    }

    return res.status(StatusCodes.OK).json({
        success: true,
        data: proctoring,
    });
};

