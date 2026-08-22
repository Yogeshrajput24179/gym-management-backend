import express from "express";
import MembershipPlan from "../models/membershipPlan.js";
import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";

const router = express.Router();

// GET all membership plans (Optionally filter active plans using query: /all?activeOnly=true)
router.get("/all", async (req, res) => {
  try {
    const { activeOnly } = req.query;
    const whereClause = activeOnly === "true" ? { status: "active" } : {};

    const membershipPlans = await MembershipPlan.findAll({
      where: whereClause,
      order: [["id", "ASC"]],
    });

    return res.status(200).json({
      success: true,
      data: membershipPlans,
    });
  } catch (error) {
    console.error("Error fetching plans:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// GET a single membership plan by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const membershipPlan = await MembershipPlan.findByPk(id);

    if (!membershipPlan) {
      return res.status(404).json({
        success: false,
        message: "Membership Plan not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: membershipPlan,
    });
  } catch (error) {
    console.error("Error fetching plan by ID:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// POST add a new membership plan
router.post("/add", verifyToken, authorize("owner", "admin"), async (req, res) => {
  try {
    const { plan_name, duration, price, description, status } = req.body;

    // Validation
    if (!plan_name || duration === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Required fields (plan_name, duration, price) are missing",
      });
    }

    if (Number(duration) <= 0 || Number(price) < 0) {
      return res.status(400).json({
        success: false,
        message: "Duration must be greater than 0 and price cannot be negative",
      });
    }

    const membershipPlan = await MembershipPlan.create({
      plan_name: plan_name.trim(),
      duration: Number(duration),
      price: parseFloat(price),
      description: description ? description.trim() : null,
      status: status || "active",
    });

    return res.status(201).json({
      success: true,
      message: "Membership Plan created successfully",
      data: membershipPlan,
    });
  } catch (error) {
    console.error("Error adding plan:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// PUT update membership plan
router.put("/update/:id", verifyToken, authorize("owner", "admin"), async (req, res) => {
  try {
    const { id } = req.params;
    const { plan_name, duration, price, description, status } = req.body;

    if (!plan_name || duration === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Required fields (plan_name, duration, price) are missing",
      });
    }

    const membershipPlan = await MembershipPlan.findByPk(id);

    if (!membershipPlan) {
      return res.status(404).json({
        success: false,
        message: "Membership Plan not found",
      });
    }

    await membershipPlan.update({
      plan_name: plan_name.trim(),
      duration: Number(duration),
      price: parseFloat(price),
      description: description !== undefined ? description.trim() : membershipPlan.description,
      status: status || membershipPlan.status,
    });

    return res.status(200).json({
      success: true,
      message: "Membership Plan updated successfully",
      data: membershipPlan,
    });
  } catch (error) {
    console.error("Error updating plan:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

// DELETE membership plan
router.delete("/delete/:id", verifyToken, authorize("owner"), async (req, res) => {
  try {
    const { id } = req.params;

    const membershipPlan = await MembershipPlan.findByPk(id);

    if (!membershipPlan) {
      return res.status(404).json({
        success: false,
        message: "Membership Plan not found",
      });
    }

    await membershipPlan.destroy();

    return res.status(200).json({
      success: true,
      message: "Membership Plan deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting plan:", error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

export default router;