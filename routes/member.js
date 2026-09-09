import express from "express";
import { Sequelize, Op } from "sequelize";
import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";

import {
  Member,
  MembershipPlan,
  Trainer
} from "../models/sequelizeModels.js";

const router = express.Router();

/**
 * Utility to normalize status values to match Database ENUM ('Active', 'Expired', 'Pending', 'Inactive')
 */
const normalizeStatus = (status) => {
  if (!status || typeof status !== "string") return "Active";
  const lower = status.toLowerCase();
  if (lower === "active") return "Active";
  if (lower === "expired") return "Expired";
  if (lower === "pending") return "Pending";
  if (lower === "inactive") return "Inactive";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

/**
 * 1. GET /api/members
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const members = await Member.findAll({
      include: [
        { model: MembershipPlan, as: "plan", attributes: ["id", "plan_name"] },
        { model: Trainer, as: "trainer_info", attributes: ["id", "full_name"] }
      ]
    });
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    console.error("Get All Members Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * 2. GET /api/members/all
 */
router.get("/all", verifyToken, async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      planId,
      trainerId,
      sortBy = "created_at",
      order = "DESC",
    } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (page - 1) * limit;

    const allowedSortFields = ["created_at", "joining_date", "full_name", "email", "phone", "status"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const sortOrder = order.toString().toUpperCase() === "ASC" ? "ASC" : "DESC";

    const where = {};

    if (search.trim()) {
      where[Op.or] = [
        { full_name: { [Op.like]: `%${search.trim()}%` } },
        { email: { [Op.like]: `%${search.trim()}%` } },
        { phone: { [Op.like]: `%${search.trim()}%` } },
      ];
    }

    if (status && status.trim() !== "") where.status = normalizeStatus(status.trim());
    if (planId && planId.trim() !== "") where.membership_plan_id = planId.trim();
    if (trainerId && trainerId.trim() !== "") where.trainer_id = trainerId.trim();

    const [countsResult, { count, rows }] = await Promise.all([
      Member.findOne({
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.col("id")), "totalRecords"],
          [Sequelize.literal(`COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END)`), "activeMembersCount"],
          [Sequelize.literal(`COUNT(CASE WHEN LOWER(status) IN ('expired', 'inactive') THEN 1 END)`), "expiredMembersCount"],
          [Sequelize.literal(`COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END)`), "pendingMembersCount"],
        ],
        raw: true,
      }),

      Member.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortField, sortOrder]],
        include: [
          { model: MembershipPlan, as: "plan", attributes: ["id", "plan_name"] },
          { model: Trainer, as: "trainer_info", attributes: ["id", "full_name"] }
        ]
      })
    ]);

    const formattedRows = rows.map((member) => {
      const plain = member.get({ plain: true });
      return {
        ...plain,
        membership: plain.plan?.plan_name || "No Plan",
        trainer: plain.trainer_info?.full_name || "Unassigned",
      };
    });

    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",
      data: formattedRows,
      meta: {
        totalRecords: count,
        activeMembersCount: parseInt(countsResult?.activeMembersCount || 0, 10),
        expiredMembersCount: parseInt(countsResult?.expiredMembersCount || 0, 10),
        pendingMembersCount: parseInt(countsResult?.pendingMembersCount || 0, 10),
        currentPage: page,
        pageSize: limit,
        totalPages: Math.ceil(count / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Fetch Members Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * 3. GET /api/members/:id
 */
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id, {
      include: [
        { model: MembershipPlan, as: "plan", attributes: ["id", "plan_name", "price"] },
        { model: Trainer, as: "trainer_info", attributes: ["id", "full_name"] }
      ]
    });

    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    return res.status(200).json({ success: true, data: member });
  } catch (error) {
    console.error("Get Member By ID Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * 4. POST /api/members/add
 */
router.post("/add",verifyToken, async (req, res) => {
  try {
    const {
      full_name, gender, phone, email, address, emergency_contact,
      membership, membership_plan_id, trainer, trainer_id, joining_date,
      status, height, weight,
    } = req.body;

    if (!full_name || !gender || !phone || !joining_date) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    if (email) {
      const existingEmail = await Member.findOne({ where: { email } });
      if (existingEmail) return res.status(400).json({ success: false, message: "Email already exists" });
    }

    const existingPhone = await Member.findOne({ where: { phone } });
    if (existingPhone) return res.status(400).json({ success: false, message: "Phone number already exists" });

    const expiryDate = new Date(joining_date);
    const planName = typeof membership === "string" ? membership : "";

    switch (planName) {
      case "Basic": expiryDate.setMonth(expiryDate.getMonth() + 1); break;
      case "Silver": expiryDate.setMonth(expiryDate.getMonth() + 3); break;
      case "Gold": expiryDate.setMonth(expiryDate.getMonth() + 6); break;
      case "Premium": expiryDate.setFullYear(expiryDate.getFullYear() + 1); break;
      default: expiryDate.setMonth(expiryDate.getMonth() + 1);
    }

    const member = await Member.create({
      full_name, gender, phone, email, address, emergency_contact,
      membership: planName || null,
      membership_plan_id: membership_plan_id || null,
      trainer: typeof trainer === "string" ? trainer : null,
      trainer_id: trainer_id || null,
      joining_date, 
      status: normalizeStatus(status), 
      height, weight, expiry_date: expiryDate,
    });

    return res.status(201).json({ success: true, message: "Member created successfully", data: member });
  } catch (error) {
    console.error("Add Member Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
});

/**
 * Update Member Handler
 */
const handleUpdateMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name, email, phone, status, gender, dob, address, emergency_contact,
      membership, membership_plan_id, trainer, trainer_id, joining_date, expiry_date,
    } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({ success: false, message: "Required fields are missing" });
    }

    const existingEmail = await Member.findOne({ where: { email, id: { [Op.ne]: id } } });
    if (existingEmail) return res.status(400).json({ success: false, message: "Email already exists" });

    const existingPhone = await Member.findOne({ where: { phone, id: { [Op.ne]: id } } });
    if (existingPhone) return res.status(400).json({ success: false, message: "Phone number already exists" });

    const member = await Member.findByPk(id);
    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    await member.update({
      full_name, gender, dob, phone, email, address, emergency_contact,
      membership, membership_plan_id, trainer, trainer_id, joining_date, expiry_date,
      status: normalizeStatus(status)
    });

    return res.status(200).json({ success: true, message: "Member updated successfully", data: member });
  } catch (error) {
    console.error("Update Member Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

router.put("/update/:id", verifyToken, handleUpdateMember);
router.put("/:id", verifyToken, handleUpdateMember);

/**
 * Delete Member Handler
 */
const handleDeleteMember = async (req, res) => {
  try {
    const { id } = req.params;
    const { hard } = req.query;
    const member = await Member.findByPk(id);

    if (!member) return res.status(404).json({ success: false, message: "Member not found" });

    if (hard === "true") {
      await member.destroy();
      return res.status(200).json({ success: true, message: "Member permanently deleted successfully" });
    }

    // Default: Soft delete (Deactivate)
    await member.update({ status: "Inactive" });

    return res.status(200).json({ success: true, message: "Member deactivated successfully" });
  } catch (error) {
    console.error("Delete Member Error:", error);
    return res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
};

router.delete("/delete/:id", verifyToken, handleDeleteMember);
router.delete("/:id", verifyToken, handleDeleteMember);

export default router;