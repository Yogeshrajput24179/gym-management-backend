import express from "express";
import { Op, fn, col } from "sequelize";

import Member from "../models/member.js";
import Trainer from "../models/trainer.js";
import MembershipPlan from "../models/membershipPlan.js";
import Attendance from "../models/attendence.js";
import Payment from "../models/payment.js";

import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";

const router = express.Router();

/**
 * Dashboard API
 * GET /api/dashboard
 */
router.get(
    "/",
    verifyToken,
    authorize("owner"),
    async (req, res) => {
        try {
            const today = new Date().toISOString().split("T")[0];

            const firstDayOfMonth = new Date(
                new Date().getFullYear(),
                new Date().getMonth(),
                1
            );

            const lastDayOfMonth = new Date(
                new Date().getFullYear(),
                new Date().getMonth() + 1,
                0
            );

            // Member Stats
            const totalMembers = await Member.count();

            const activeMembers = await Member.count({
                where: {
                    status: "active",
                },
            });

            const inactiveMembers = await Member.count({
                where: {
                    status: "inactive",
                },
            });

            // Trainer Stats
            const totalTrainers = await Trainer.count();

            // Membership Plans
            const totalPlans = await MembershipPlan.count();

            // Today's Attendance
            const todayAttendance = await Attendance.count({
                where: {
                    attendance_date: today,
                },
            });

            // Pending Payments
            const pendingPayments = await Payment.count({
                where: {
                    status: "Pending",
                },
            });

            // Today's Revenue
            const todayRevenue = await Payment.findOne({
                attributes: [
                    [fn("SUM", col("amount")), "totalRevenue"],
                ],
                where: {
                    status: "Paid",
                    payment_date: today,
                },
                raw: true,
            });

            // Monthly Revenue
            const monthlyRevenue = await Payment.findOne({
                attributes: [
                    [fn("SUM", col("amount")), "totalRevenue"],
                ],
                where: {
                    status: "Paid",
                    payment_date: {
                        [Op.between]: [
                            firstDayOfMonth,
                            lastDayOfMonth,
                        ],
                    },
                },
                raw: true,
            });

            return res.status(200).json({
                success: true,
                message: "Dashboard data fetched successfully",
                data: {
                    totalMembers,
                    activeMembers,
                    inactiveMembers,
                    totalTrainers,
                    totalPlans,
                    todayAttendance,
                    pendingPayments,
                    todayRevenue:
                        Number(todayRevenue?.totalRevenue || 0),
                    monthlyRevenue:
                        Number(monthlyRevenue?.totalRevenue || 0),
                },
            });
        } catch (error) {
            console.error(error);

            return res.status(500).json({
                success: false,
                message: "Internal Server Error",
                error: error.message,
            });
        }
    }
);

export default router;