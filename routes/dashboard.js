import express from "express";
import { Op, fn, col } from "sequelize";

import Member from "../models/member.js";
import Trainer from "../models/trainer.js";
import MembershipPlan from "../models/membershipPlan.js";
import Attendance from "../models/attendence.js";
import Payment from "../models/payment.js";

import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

/**
 * GET /api/dashboard
 * Returns comprehensive dashboard stats
 */
router.get("/", verifyToken, async (req, res) => {
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

    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysStr = sevenDaysFromNow.toISOString().split("T")[0];

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const thirtyDaysStr = thirtyDaysFromNow.toISOString().split("T")[0];

    const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];

    const [
      totalMembers,
      activeMembers,
      inactiveMembers,
      newMembersThisMonth,
      expiringSoon7,
      expiringSoon30,
      expiredMembers,
      totalTrainers,
      totalPlans,
      todayAttendance,
      pendingPayments,
      pendingPaymentsAmountResult,
      todayRevenueResult,
      monthlyRevenueResult,
      totalRevenueResult,
      recentMembers,
      recentPayments,
    ] = await Promise.all([
      Member.count(),
      Member.count({ where: { status: { [Op.in]: ["Active", "active"] } } }),
      Member.count({ where: { status: { [Op.in]: ["Inactive", "inactive"] } } }),
      Member.count({ where: { joining_date: { [Op.gte]: firstDayStr } } }),
      Member.count({
        where: {
          expiry_date: { [Op.between]: [today, sevenDaysStr] },
          status: { [Op.in]: ["Active", "active"] },
        },
      }),
      Member.count({
        where: {
          expiry_date: { [Op.between]: [today, thirtyDaysStr] },
          status: { [Op.in]: ["Active", "active"] },
        },
      }),
      Member.count({
        where: {
          expiry_date: { [Op.lt]: today },
          status: { [Op.in]: ["Active", "active"] },
        },
      }),
      Trainer.count(),
      MembershipPlan.count(),
      Attendance.count({ where: { attendance_date: today } }),
      Payment.count({ where: { status: "Pending" } }),
      Payment.findOne({
        attributes: [[fn("SUM", col("amount")), "total"]],
        where: { status: "Pending" },
        raw: true,
      }),
      Payment.findOne({
        attributes: [[fn("SUM", col("amount")), "totalRevenue"]],
        where: { status: "Paid", payment_date: today },
        raw: true,
      }),
      Payment.findOne({
        attributes: [[fn("SUM", col("amount")), "totalRevenue"]],
        where: {
          status: "Paid",
          payment_date: { [Op.between]: [firstDayOfMonth, lastDayOfMonth] },
        },
        raw: true,
      }),
      Payment.findOne({
        attributes: [[fn("SUM", col("amount")), "totalRevenue"]],
        where: { status: "Paid" },
        raw: true,
      }),
      Member.findAll({
        include: [
          { model: MembershipPlan, as: "plan", attributes: ["id", "plan_name"] },
        ],
        order: [["created_at", "DESC"]],
        limit: 5,
      }),
      Payment.findAll({
        include: [
          { model: Member, attributes: ["id", "full_name", "phone"] },
          { model: MembershipPlan, attributes: ["id", "plan_name"] },
        ],
        order: [["id", "DESC"]],
        limit: 5,
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched successfully",
      data: {
        totalMembers,
        activeMembers,
        inactiveMembers,
        newMembersThisMonth,
        expiringSoon7,
        expiringSoon30,
        expiredMembers,
        totalTrainers,
        totalPlans,
        todayAttendance,
        pendingPayments,
        pendingPaymentsAmount: Number(pendingPaymentsAmountResult?.total || 0),
        todayRevenue: Number(todayRevenueResult?.totalRevenue || 0),
        monthlyRevenue: Number(monthlyRevenueResult?.totalRevenue || 0),
        totalRevenue: Number(totalRevenueResult?.totalRevenue || 0),
        recentMembers,
        recentPayments,
      },
    });
  } catch (error) {
    console.error("Dashboard Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: error.message,
    });
  }
});

export default router;