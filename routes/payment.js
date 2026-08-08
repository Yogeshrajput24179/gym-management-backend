import express from "express";
import { Op } from "sequelize";

import Payment from "../models/payment.js";
import Member from "../models/member.js";
import MembershipPlan from "../models/membershipPlan.js";

import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";

const router = express.Router();

/**
 * Add Payment
 */
router.post(
    "/add",
    verifyToken,
    authorize("owner"),
    async (req, res) => {
        try {
            const {
                member_id,
                membership_plan_id,
                amount,
                payment_date,
                payment_method,
                transaction_id,
                status,
                remarks,
            } = req.body;

            if (
                !member_id ||
                !membership_plan_id ||
                !amount ||
                !payment_date ||
                !payment_method
            ) {
                return res.status(400).json({
                    success: false,
                    message: "All required fields are mandatory",
                });
            }

            const member = await Member.findByPk(member_id);

            if (!member) {
                return res.status(404).json({
                    success: false,
                    message: "Member not found",
                });
            }

            const plan = await MembershipPlan.findByPk(membership_plan_id);

            if (!plan) {
                return res.status(404).json({
                    success: false,
                    message: "Membership plan not found",
                });
            }

            const payment = await Payment.create({
                member_id,
                membership_plan_id,
                amount,
                payment_date,
                payment_method,
                transaction_id,
                status,
                remarks,
            });

            return res.status(201).json({
                success: true,
                message: "Payment added successfully",
                data: payment,
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

/**
 * Get All Payments
 */
router.get(
    "/all",
    verifyToken,
    authorize("owner"),
    async (req, res) => {
        try {
            let {
                page = 1,
                limit = 10,
                search = "",
                status,
                payment_method,
                sortBy = "created_at",
                order = "DESC",
            } = req.query;

            page = Number(page);
            limit = Number(limit);

            const offset = (page - 1) * limit;

            const where = {};

            if (status) where.status = status;
            if (payment_method) where.payment_method = payment_method;

            const { count, rows } = await Payment.findAndCountAll({
                where,
                include: [
                    {
                        model: Member,
                        attributes: ["id", "full_name", "phone"],
                        where: search
                            ? {
                                  full_name: {
                                      [Op.like]: `%${search}%`,
                                  },
                              }
                            : undefined,
                        required: !!search,
                    },
                    {
                        model: MembershipPlan,
                        attributes: ["id", "plan_name"],
                    },
                ],
                order: [[sortBy, order]],
                limit,
                offset,
            });

            return res.status(200).json({
                success: true,
                message: "Payments fetched successfully",
                data: rows,
                meta: {
                    totalRecords: count,
                    currentPage: page,
                    pageSize: limit,
                    totalPages: Math.ceil(count / limit),
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

/**
 * Get Single Payment
 */
router.get(
    "/:id",
    verifyToken,
    authorize("owner"),
    async (req, res) => {
        try {
            const payment = await Payment.findByPk(req.params.id, {
                include: [
                    {
                        model: Member,
                        attributes: ["id", "full_name", "phone", "email"],
                    },
                    {
                        model: MembershipPlan,
                        attributes: ["id", "plan_name"],
                    },
                ],
            });

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found",
                });
            }

            return res.status(200).json({
                success: true,
                data: payment,
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

/**
 * Update Payment
 */
router.put(
    "/update/:id",
    verifyToken,
    authorize("owner"),
    async (req, res) => {
        try {
            const payment = await Payment.findByPk(req.params.id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found",
                });
            }

            await payment.update(req.body);

            return res.status(200).json({
                success: true,
                message: "Payment updated successfully",
                data: payment,
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

/**
 * Delete Payment
 */
router.delete(
    "/delete/:id",
    verifyToken,
    authorize("owner"),
    async (req, res) => {
        try {
            const payment = await Payment.findByPk(req.params.id);

            if (!payment) {
                return res.status(404).json({
                    success: false,
                    message: "Payment not found",
                });
            }

            await payment.destroy();

            return res.status(200).json({
                success: true,
                message: "Payment deleted successfully",
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