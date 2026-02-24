import { Schema, model, Types } from "mongoose";

const examSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },

        description: {
            type: String,
            trim: true
        },

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard"],
            required: true
        },

        duration: {
            type: Number,
            required: true,
            min: 1,
            max: 180
        },

        examRepoLink: {
            type: String,
            required: true,
            trim: true,
            match: [/^https?:\/\/.+/, "Please provide a valid URL"]
        },

        createdBy: {
            type: Types.ObjectId,
            ref: "User",
            required: true
        },

        updatedBy: {
            type: Types.ObjectId,
            ref: "User"
        },

        isActive: {
            type: Boolean,
            default: true
        },

        deletedAt: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true
    }
);

export const Exam = model("Exam", examSchema);
