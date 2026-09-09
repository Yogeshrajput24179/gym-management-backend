import express from "express";
import { Op, fn, col } from "sequelize";

import Payment from "../models/payment.js";
import Attendance from "../models/attendence.js";
import Member from "../models/member.js";
import Trainer from "../models/trainer.js";

import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";

const router = express.Router();



router.get(
    "/revenue",
    verifyToken,
    authorize("owner", "admin", "staff"),
    async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: "startDate and endDate are required",
                });
            }

            const payments = await Payment.findAll({
                where: {
                    payment_date: {
                        [Op.between]: [startDate, endDate],
                    },
                    status: "Paid",
                },
            });

            const totalRevenue = await Payment.findOne({
                attributes: [
                    [fn("SUM", col("amount")), "revenue"],
                ],
                where: {
                    payment_date: {
                        [Op.between]: [startDate, endDate],
                    },
                    status: "Paid",
                },
                raw: true,
            });

            return res.status(200).json({
                success: true,
                data: {
                    totalRevenue: Number(totalRevenue?.revenue || 0),
                    totalTransactions: payments.length,
                    payments,
                },
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }
);

router.get(
    "/attendance",
    verifyToken,
    authorize("owner", "admin", "staff"),
    async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            const attendance = await Attendance.findAll({
                where: {
                    attendance_date: {
                        [Op.between]: [startDate, endDate],
                    },
                },
                include: [
                    {
                        model: Member,
                        attributes: ["id", "full_name"],
                    },
                    {
                        model: Trainer,
                        attributes: ["id", "full_name"],
                    },
                ],
            });

            return res.status(200).json({
                success: true,
                totalRecords: attendance.length,
                data: attendance,
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }
);

router.get(
    "/expiring-memberships",
    verifyToken,
    authorize("owner", "admin", "staff"),
    async (req, res) => {
        try {
            const today = new Date();

            const next7Days = new Date();
            next7Days.setDate(today.getDate() + 7);

            const members = await Member.findAll({
                where: {
                    expiry_date: {
                        [Op.between]: [today, next7Days],
                    },
                    status: "active",
                },
            });

            return res.status(200).json({
                success: true,
                totalMembers: members.length,
                data: members,
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }
);

router.get(
    "/pending-payments",
    verifyToken,
    authorize("owner", "admin", "staff"),
    async (req, res) => {
        try {
            const payments = await Payment.findAll({
                where: {
                    status: "Pending",
                },
                include: [
                    {
                        model: Member,
                        attributes: ["id", "full_name", "phone"],
                    },
                ],
            });

            return res.status(200).json({
                success: true,
                totalPending: payments.length,
                data: payments,
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }
);

router.get(
    "/trainer-members",
    verifyToken,
    authorize("owner", "admin", "staff"),
    async (req, res) => {
        try {
            const trainers = await Trainer.findAll({
                include: [
                    {
                        model: Member,
                        attributes: [
                            "id",
                            "full_name",
                            "phone",
                            "email",
                        ],
                    },
                ],
            });

            return res.status(200).json({
                success: true,
                data: trainers,
            });

        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
            });
        }
    }
);

export default router;