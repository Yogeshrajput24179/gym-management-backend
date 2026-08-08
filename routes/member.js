import express from "express";
import Member from "../models/member.js";
import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";
import { Sequelize, Op } from "sequelize";

const router = express.Router();

/**
 * 1. GET /api/members
 * Simple fetch for all members
 */
router.get("/", async (req, res) => {
  try {
    const members = await Member.findAll();
    return res.status(200).json({ success: true, data: members });
  } catch (error) {
    console.error("Get All Members Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * 2. GET /api/members/all
 * Paginated, searchable & filterable member list
 * NOTE: Must be defined BEFORE GET /:id so "all" isn't matched as an ID parameter.
 */
router.get("/all", async (req, res) => {
  try {
    let {
      page = 1,
      limit = 10,
      search = "",
      status,
      sortBy = "created_at",
      order = "DESC",
    } = req.query;

    page = Math.max(1, parseInt(page, 10) || 1);
    limit = Math.max(1, parseInt(limit, 10) || 10);
    const offset = (page - 1) * limit;

    const allowedSortFields = [
      "created_at",
      "joining_date",
      "full_name",
      "email",
      "phone",
      "status",
    ];

    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "created_at";
    const sortOrder = order.toString().toUpperCase() === "ASC" ? "ASC" : "DESC";

    const where = {};

    // Search Filter (Uses Op.iLike for Postgres, swap to Op.like for MySQL/SQLite)
    if (search.trim()) {
      where[Op.or] = [
        { full_name: { [Op.iLike]: `%${search.trim()}%` } },
        { email: { [Op.iLike]: `%${search.trim()}%` } },
        { phone: { [Op.iLike]: `%${search.trim()}%` } },
      ];
    }

    if (status && status.trim() !== "") {
      where.status = status.trim();
    }

    const [countsResult, { count, rows }] = await Promise.all([
      Member.findOne({
        attributes: [
          [Sequelize.fn("COUNT", Sequelize.col("id")), "totalRecords"],
          [
            Sequelize.literal(
              `COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END)`
            ),
            "activeMembersCount",
          ],
          [
            Sequelize.literal(
              `COUNT(CASE WHEN LOWER(status) IN ('expired', 'inactive') THEN 1 END)`
            ),
            "expiredMembersCount",
          ],
          [
            Sequelize.literal(
              `COUNT(CASE WHEN LOWER(status) = 'pending' THEN 1 END)`
            ),
            "pendingMembersCount",
          ],
        ],
        raw: true,
      }),

      Member.findAndCountAll({
        where,
        limit,
        offset,
        order: [[sortField, sortOrder]],
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Members fetched successfully",
      data: rows,
      meta: {
        totalRecords: parseInt(countsResult?.totalRecords || count, 10),
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
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

/**
 * 3. GET /api/members/:id
 * Fetch single member by ID
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: member,
    });
  } catch (error) {
    console.error("Get Member By ID Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

/**
 * 4. POST /api/members/add
 * Add new member
 */
router.post("/add", verifyToken, async (req, res) => {
  try {
    const {
      full_name,
      gender,
      phone,
      email,
      address,
      emergency_contact,
      membership,
      trainer,
      joining_date,
      status,
      height,
      weight,
    } = req.body;

    if (!full_name || !gender || !phone || !joining_date || !membership || !status) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    if (email) {
      const existingEmail = await Member.findOne({ where: { email } });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email already exists",
        });
      }
    }

    const existingPhone = await Member.findOne({ where: { phone } });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    const expiryDate = new Date(joining_date);
    switch (membership) {
      case "Basic":
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        break;
      case "Silver":
        expiryDate.setMonth(expiryDate.getMonth() + 3);
        break;
      case "Gold":
        expiryDate.setMonth(expiryDate.getMonth() + 6);
        break;
      case "Premium":
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        break;
    }

    const member = await Member.create({
      full_name,
      gender,
      phone,
      email,
      address,
      emergency_contact,
      membership,
      trainer,
      joining_date,
      status: status || "Active",
      height,
      weight,
      expiry_date: expiryDate,
    });

    return res.status(201).json({
      success: true,
      message: "Member created successfully",
      data: member,
    });
  } catch (error) {
    console.error("Add Member Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
    });
  }
});

/**
 * 5. PUT /api/members/update/:id
 * Update existing member
 */
router.put("/update/:id", verifyToken, authorize("owner"), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      full_name,
      email,
      phone,
      status,
      gender,
      dob,
      address,
      emergency_contact,
      membership_plan_id,
      trainer_id,
      joining_date,
      expiry_date,
    } = req.body;

    if (!full_name || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    const existingEmail = await Member.findOne({
      where: { email, id: { [Op.ne]: id } },
    });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const existingPhone = await Member.findOne({
      where: { phone, id: { [Op.ne]: id } },
    });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "Phone number already exists",
      });
    }

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    member.full_name = full_name;
    member.gender = gender;
    member.dob = dob;
    member.phone = phone;
    member.email = email;
    member.address = address;
    member.emergency_contact = emergency_contact;
    member.membership_plan_id = membership_plan_id;
    member.trainer_id = trainer_id;
    member.joining_date = joining_date;
    member.expiry_date = expiry_date;
    member.status = status;

    await member.save();

    return res.status(200).json({
      success: true,
      message: "Member updated successfully",
      data: member,
    });
  } catch (error) {
    console.error("Update Member Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

/**
 * 6. DELETE /api/members/delete/:id
 * Soft-delete / deactivate member
 */
router.delete("/delete/:id", verifyToken, authorize("owner"), async (req, res) => {
  try {
    const { id } = req.params;
    const member = await Member.findByPk(id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    await member.update({ status: "inactive" });

    return res.status(200).json({
      success: true,
      message: "Member deactivated successfully",
    });
  } catch (error) {
    console.error("Delete Member Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export default router;