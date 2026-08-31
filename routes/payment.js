import express from "express";
import { Op } from "sequelize";

import Payment from "../models/payment.js";
import Member from "../models/member.js";
import MembershipPlan from "../models/membershipPlan.js";
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

const ALLOWED_PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank Transfer"];
const ALLOWED_STATUS = ["Paid", "Pending"];
const ALLOWED_SORT_FIELDS = ["id", "amount", "payment_date", "createdAt", "updatedAt"];
const ALLOWED_SORT_ORDERS = ["ASC", "DESC"];

// POST: Add new payment
router.post("/add", verifyToken, async (req, res) => {
  try {
    const {
      member_id,
      membership_plan_id,
      amount,
      payment_date,
      payment_method,
      transaction_id,
      status = "Paid",
      remarks,
    } = req.body;

    if (
      member_id === undefined ||
      membership_plan_id === undefined ||
      amount === undefined ||
      !payment_date ||
      !payment_method
    ) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    const paymentAmount = Number(amount);
    if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount must be greater than 0",
      });
    }

    if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment method. Allowed values: ${ALLOWED_PAYMENT_METHODS.join(", ")}`,
      });
    }

    if (!ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Allowed values: ${ALLOWED_STATUS.join(", ")}`,
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
      amount: paymentAmount,
      payment_date,
      payment_method,
      transaction_id: transaction_id || null,
      status,
      remarks: remarks || null,
    });

    const createdPayment = await Payment.findByPk(payment.id, {
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

    return res.status(201).json({
      success: true,
      message: "Payment added successfully",
      data: createdPayment,
    });
  } catch (error) {
    console.error("Add Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// GET: All payments handler
const handleGetAllPayments = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      payment_method,
      membership_plan_id,
      sortBy = "id",
      order = "DESC",
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1) limit = 10;
    if (limit > 100) limit = 100;

    const offset = (page - 1) * limit;

    if (!ALLOWED_SORT_FIELDS.includes(sortBy)) {
      sortBy = "id";
    }

    order = String(order).toUpperCase();
    if (!ALLOWED_SORT_ORDERS.includes(order)) {
      order = "DESC";
    }

    const where = {};

    if (status && ALLOWED_STATUS.includes(status)) {
      where.status = status;
    }

    if (payment_method && ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
      where.payment_method = payment_method;
    }

    if (membership_plan_id) {
      where.membership_plan_id = membership_plan_id;
    }

    const memberWhere = {};

    if (search?.trim()) {
      const searchValue = search.trim();
      memberWhere[Op.or] = [
        { full_name: { [Op.like]: `%${searchValue}%` } },
        { phone: { [Op.like]: `%${searchValue}%` } },
        { email: { [Op.like]: `%${searchValue}%` } },
      ];
    }

    const { count, rows } = await Payment.findAndCountAll({
      where,
      include: [
        {
          model: Member,
          attributes: ["id", "full_name", "phone", "email"],
          where: Object.keys(memberWhere).length > 0 ? memberWhere : undefined,
          required: Object.keys(memberWhere).length > 0,
        },
        {
          model: MembershipPlan,
          attributes: ["id", "plan_name"],
        },
      ],
      order: [[sortBy, order]],
      limit,
      offset,
      distinct: true,
    });

    const totalPages = Math.ceil(count / limit);

    return res.status(200).json({
      success: true,
      message: "Payments fetched successfully",
      data: rows,
      meta: {
        totalRecords: count,
        currentPage: page,
        pageSize: limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Get Payments Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

router.get("/all", verifyToken, handleGetAllPayments);
router.get("/", verifyToken, handleGetAllPayments);

// GET: Single payment by ID (Removed verifyToken & authorize)
router.get("/:id", verifyToken, async (req, res) => {
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
      message: "Payment fetched successfully",
      data: payment,
    });
  } catch (error) {
    console.error("Get Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// PUT: Update payment (Removed verifyToken & authorize)
router.put("/update/:id", verifyToken, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

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

    const updateData = {};

    if (member_id !== undefined) {
      const member = await Member.findByPk(member_id);
      if (!member) {
        return res.status(404).json({
          success: false,
          message: "Member not found",
        });
      }
      updateData.member_id = member_id;
    }

    if (membership_plan_id !== undefined) {
      const plan = await MembershipPlan.findByPk(membership_plan_id);
      if (!plan) {
        return res.status(404).json({
          success: false,
          message: "Membership plan not found",
        });
      }
      updateData.membership_plan_id = membership_plan_id;
    }

    if (amount !== undefined) {
      const paymentAmount = Number(amount);
      if (Number.isNaN(paymentAmount) || paymentAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: "Amount must be greater than 0",
        });
      }
      updateData.amount = paymentAmount;
    }

    if (payment_date !== undefined) updateData.payment_date = payment_date;

    if (payment_method !== undefined) {
      if (!ALLOWED_PAYMENT_METHODS.includes(payment_method)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment method",
        });
      }
      updateData.payment_method = payment_method;
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid payment status",
        });
      }
      updateData.status = status;
    }

    if (transaction_id !== undefined) updateData.transaction_id = transaction_id;
    if (remarks !== undefined) updateData.remarks = remarks;

    await payment.update(updateData);

    const updatedPayment = await Payment.findByPk(payment.id, {
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

    return res.status(200).json({
      success: true,
      message: "Payment updated successfully",
      data: updatedPayment,
    });
  } catch (error) {
    console.error("Update Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// DELETE: Delete payment (Removed verifyToken & authorize)
router.delete("/delete/:id", verifyToken, async (req, res) => {
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
    console.error("Delete Payment Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export default router;