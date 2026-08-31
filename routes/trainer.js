import express from "express";
import Trainer from "../models/trainer.js";
import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";
import { Sequelize, Op } from "sequelize";
const router = express.Router();

/**
 * Create Trainer
 */
router.post(
    "/add",
    verifyToken,
    async (req, res) => {
        console.log("hitt api")
        try {
            const {
                full_name,
                phone,
                email,
                specialization,
                experience,
                salary,
                joining_date,
                status,
            } = req.body;

            // Validation
            if (
                !full_name ||
                !phone ||
                !email ||
                !joining_date
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Required fields are missing",
                });
            }

            // Check Email
            const existingEmail = await Trainer.findOne({
                where: { email },
            });

            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists",
                });
            }

            // Check Phone
            const existingPhone = await Trainer.findOne({
                where: { phone },
            });

            if (existingPhone) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number already exists",
                });
            }

            // Create Trainer
            const trainer = await Trainer.create({
                full_name,
                phone,
                email,
                specialization,
                experience,
                salary,
                joining_date,
                status,
            });

            return res.status(201).json({
                success: true,
                message: "Trainer created successfully",
                data: trainer,
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
 * Get All Trainers
 */
router.get("/all", verifyToken, async (req, res) => {
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

        const sortField = allowedSortFields.includes(sortBy)
            ? sortBy
            : "created_at";

        const sortOrder =
            order.toString().toUpperCase() === "ASC" ? "ASC" : "DESC";

        const where = {};

        // Search
        if (search.trim()) {
            where[Op.or] = [
                { full_name: { [Op.iLike]: `%${search.trim()}%` } },
                { email: { [Op.iLike]: `%${search.trim()}%` } },
                { phone: { [Op.iLike]: `%${search.trim()}%` } },
            ];
        }

        // Status Filter
        if (status && status.trim() !== "") {
            where.status = status.trim();
        }

        const [countsResult, { count, rows }] = await Promise.all([
            Trainer.findOne({
                attributes: [
                    [
                        Sequelize.fn("COUNT", Sequelize.col("id")),
                        "totalRecords",
                    ],
                    [
                        Sequelize.literal(
                            `COUNT(CASE WHEN LOWER(status) = 'active' THEN 1 END)`
                        ),
                        "activeTrainersCount",
                    ],
                    [
                        Sequelize.literal(
                            `COUNT(CASE WHEN LOWER(status) = 'inactive' THEN 1 END)`
                        ),
                        "inactiveTrainersCount",
                    ],
                    [
                        Sequelize.literal(
                            `COUNT(specialization)`
                        ),
                        "specializationsCount",

                    ],
                ],
                raw: true,
            }),

            Trainer.findAndCountAll({
                where,
                limit,
                offset,
                order: [[sortField, sortOrder]],
            }),
        ]);

        return res.status(200).json({
            success: true,
            message: "Trainers fetched successfully",
            data: rows,
            meta: {
                totalRecords: parseInt(
                    countsResult?.totalRecords || count,
                    10
                ),
                activeTrainersCount: parseInt(
                    countsResult?.activeTrainersCount || 0,
                    10
                ),
                inactiveTrainersCount: parseInt(
                    countsResult?.inactiveTrainersCount || 0,
                    10
                ),
                specializationsCount: parseInt(
                    countsResult?.specializationsCount || 0,
                    10
                ),
                currentPage: page,
                pageSize: limit,
                totalPages: Math.ceil(count / limit) || 1,
            },
        });
    } catch (error) {
        console.error("Fetch Trainers Error:", error);

        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

/**
 * Get Single Trainer
 */
router.get(
    "/:id",
    verifyToken,
    async (req, res) => {
        try {
            const { id } = req.params;

            const trainer = await Trainer.findByPk(id);

            if (!trainer) {
                return res.status(404).json({
                    success: false,
                    message: "Trainer not found",
                });
            }

            return res.status(200).json({
                success: true,
                message: "Trainer fetched successfully",
                data: trainer,
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
 * Update Trainer
 */
router.put(
    "/update/:id",
    verifyToken,
    async (req, res) => {
        try {
            const { id } = req.params;

            const trainer = await Trainer.findByPk(id);

            if (!trainer) {
                return res.status(404).json({
                    success: false,
                    message: "Trainer not found",
                });
            }

            const {
                full_name,
                phone,
                email,
                specialization,
                experience,
                salary,
                joining_date,
                status,
            } = req.body;

            const existingEmail = await Trainer.findOne({
                where: {
                    email,
                    id: {
                        [Op.ne]: id,
                    },
                },
            });

            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: "Email already exists",
                });
            }

            const existingPhone = await Trainer.findOne({
                where: {
                    phone,
                    id: {
                        [Op.ne]: id,
                    },
                },
            });

            if (existingPhone) {
                return res.status(400).json({
                    success: false,
                    message: "Phone number already exists",
                });
            }

            await trainer.update({
                full_name,
                phone,
                email,
                specialization,
                experience,
                salary,
                joining_date,
                status,
            });

            return res.status(200).json({
                success: true,
                message: "Trainer updated successfully",
                data: trainer,
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
 * Delete Trainer (Soft Delete)
 */
router.delete(
    "/delete/:id",
    verifyToken,
    async (req, res) => {
        try {
            const { id } = req.params;

            const trainer = await Trainer.findByPk(id);

            if (!trainer) {
                return res.status(404).json({
                    success: false,
                    message: "Trainer not found",
                });
            }

            await trainer.update({
                status: "inactive",
            });

            return res.status(200).json({
                success: true,
                message: "Trainer deactivated successfully",
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