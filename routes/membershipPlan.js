import express from "express";
import MembershipPlan from "../models/membershipPlan.js";
import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";

const router = express.Router();

router.post("/add", verifyToken, authorize("owner"), async (req, res) => {
    try {
        const { plan_name, duration, price, description, status } = req.body;

        // Validation
        if (!plan_name || !duration || !price) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing",
            });
        }

        // Create Membership Plan
        const membershipPlan = await MembershipPlan.create({
            plan_name,
            duration,
            price,
            description,
            status,
        });

        return res.status(201).json({
            success: true,
            message: "Membership Plan created successfully",
            data: membershipPlan,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

router.put("/update/:id", verifyToken, authorize("owner"), async (req, res) => {
    try {
        const { id } = req.params;
        const { plan_name, duration, price, description, status } = req.body;

        // Validation
        if (!plan_name || !duration || !price) {
            return res.status(400).json({
                success: false,
                message: "Required fields are missing",
            });
        }

        // Find Membership Plan
        const membershipPlan = await MembershipPlan.findByPk(id);

        if (!membershipPlan) {
            return res.status(404).json({
                success: false,
                message: "Membership Plan not found",
            });
        }

        // Update Membership Plan
        membershipPlan.plan_name = plan_name;
        membershipPlan.duration = duration;
        membershipPlan.price = price;
        membershipPlan.description = description;
        membershipPlan.status = status;

        await membershipPlan.save();

        return res.status(200).json({
            success: true,
            message: "Membership Plan updated successfully",
            data: membershipPlan,
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

router.delete("/delete/:id", verifyToken, authorize("owner"), async (req, res) => {
    try {
        const { id } = req.params;

        // Find Membership Plan
        const membershipPlan = await MembershipPlan.findByPk(id);

        if (!membershipPlan) {
            return res.status(404).json({
                success: false,
                message: "Membership Plan not found",
            });
        }

        // Delete Membership Plan
        await membershipPlan.destroy();

        return res.status(200).json({
            success: true,
            message: "Membership Plan deleted successfully",
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

export default router;