import { Request, Response } from "express";
import { User } from "./user.model";
import { HiringDrive } from "../hiring-drives/hiringDrive.model";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_EXPIRES_IN = Number(process.env.JWT_EXPIRES_IN ?? '3600');
const CREATE_USER_CODE = process.env.CREATE_USER_CODE;
import { StatusCodes } from 'http-status-codes'
import { Result } from "../results/result.model";

export const createUser = async (req: Request, res: Response) => {
    const { name, email, password, role, code } = req.body;

    if (code !== CREATE_USER_CODE) {
        return res.status(StatusCodes.BAD_REQUEST).json({
            success: false,
            message: "Invalid code"
        });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const created_user = new User({ name, email, password: hashedPassword, role });
    const save_user = await created_user.save();
    const userObj = save_user.toObject() as any;
    delete userObj.password;

    res.json({ success: true, data: userObj });
};

export const loginUser = async (req: Request, res: Response) => {

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found"
        });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(StatusCodes.UNAUTHORIZED).json({
            success: false,
            message: "Invalid credentials"
        });
    }

    const token = jwt.sign(
        { id: String(user._id), email: user.email, role: user.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );

    const { password: _, ...userWithoutPassword } = user.toObject();

    return res.json({
        success: true,
        data: {
            token,
            user: userWithoutPassword,
        }
    });
};

export const updateMyUser = async (req: Request, res: Response) => {
    const userId = req.user?.id

    if (req.body.password) {
        req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    delete req.body.role; // Prevent role update

    const user = await User.findOneAndUpdate(
        { _id: userId, deletedAt: null },
        req.body,
        { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found"
        });
    }

    res.json({ success: true, data: user });
};

export const updateUserById = async (req: Request, res: Response) => {
    const { userId } = req.params;

    if (req.body.password) {
        req.body.password = await bcrypt.hash(req.body.password, 10);
    }

    delete req.body.role; // Prevent role update

    const user = await User.findOneAndUpdate(
        { _id: userId, deletedAt: null },
        req.body,
        { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found"
        });
    }

    res.json({ success: true, data: user });
};

export const deleteMyUser = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const user = await User.findOneAndUpdate(
        { _id: userId, deletedAt: null },
        { deletedAt: new Date() },
        { returnDocument: "after" }
    );

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found or already deleted"
        });
    }

    res.json({ success: true, message: "User deleted successfully" });
};

export const deleteUserById = async (req: Request, res: Response) => {
    const { userId } = req.params;

    const user = await User.findOneAndUpdate(
        { _id: userId, deletedAt: null },
        { deletedAt: new Date() },
        { returnDocument: "after" }
    );

    if (!user) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "User not found or already deleted"
        });
    }

    res.json({ success: true, message: "User deleted successfully" });
};

export const getAllUsers = async (_req: Request, res: Response) => {
    const users = await User.find(
        { deletedAt: null },
        { password: 0 }
    ).sort({ createdAt: -1 });

    res.json({
        success: true,
        data: users
    });
};

export const getUserHiringDrivesById = async (req: Request, res: Response) => {
    const { userId } = req.params;

    const drives = await HiringDrive.find({
        deletedAt: null,
        "candidates.userId": userId
    })
        .select("-exams")
        .sort({ createdAt: -1 });

    const data = drives.map(drive => {
        const candidate = drive.candidates.find(
            c => c.userId.toString() === userId
        );

        return {
            _id: drive._id,
            name: drive.name,
            code: drive.code,
            startsAt: drive.startsAt,
            endsAt: drive.endsAt,
            isActive: drive.isActive,
            attemptsUsed: candidate?.attemptsUsed ?? 0
        };
    });

    res.json({
        success: true,
        count: data.length,
        data
    });
};

export const getMyHiringDrives = async (req: Request, res: Response) => {
    const userId = req.user?.id;

    const drives = await HiringDrive.find({
        deletedAt: null,
        "candidates.userId": userId
    })
        .select("-exams")
        .sort({ createdAt: -1 });

    const data = drives.map(drive => {
        const candidate = drive.candidates.find(
            c => c.userId.toString() === userId
        );

        return {
            _id: drive._id,
            name: drive.name,
            code: drive.code,
            startsAt: drive.startsAt,
            endsAt: drive.endsAt,
            isActive: drive.isActive,
            attemptsUsed: candidate?.attemptsUsed ?? 0
        };
    });

    res.json({
        success: true,
        count: data.length,
        data
    });
};

export const getMyHiringDriveExam = async (req: Request, res: Response) => {
    const userId = req.user?.id;
    const { driveId } = req.params;

    const drive = await HiringDrive.findOne({
        _id: driveId,
        deletedAt: null,
    })
        .select("name exams candidates")
        .populate({
            path: "exams",
            select: "title description difficulty duration isActive examRepoLink",
        });


    if (!drive) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Hiring drive not found",
        });
    }

    const isCandidate = drive.candidates.some(
        (c) => c.userId.toString() === userId
    );

    if (!isCandidate) {
        return res.status(StatusCodes.FORBIDDEN).json({
            success: false,
            message: "You are not registered for this hiring drive",
        });
    }

    res.json({
        success: true,
        data: drive.exams,
    });
};

export const getUserHiringDriveResult = async (req: Request, res: Response) => {
    const { id, userId } = req.params;

    const drive = await HiringDrive.findOne({
        _id: id,
        deletedAt: null,
    }).select("name passingMarks");

    if (!drive) {
        return res.status(StatusCodes.NOT_FOUND).json({
            success: false,
            message: "Hiring drive not found",
        });
    }

    // ✅ fetch history (all attempts)
    const history = await Result.find({
        hiringDriveId: id,
        userId,
    })
        .populate("examId", "title totalMarks")
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .lean();

    // optional: if no results, still return drive info
    return res.json({
        success: true,
        data: {
            drive,
            user: history?.[0]?.userId || { _id: userId },
            history,
        },
    });
};
