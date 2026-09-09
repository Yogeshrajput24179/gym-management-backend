import express from "express";
import Attendance from "../models/attendence.js";
import Member from "../models/member.js";
import Trainer from "../models/trainer.js";
import verifyToken from "../middleware/verifyToken.js";
import authorize from "../middleware/authorize.js";
import { Op } from "sequelize";

const router = express.Router();

/**
 * Utility to convert any string ("11:04 am", "2:30pm", etc.) 
 * into strict MySQL TIME format ("HH:mm:ss" 24-hr format).
 */
const formatToMySQLTime = (timeStr) => {
    if (!timeStr) return null;

    // If already in standard 24-hr "HH:mm:ss" format
    if (/^\d{2}:\d{2}:\d{2}$/.test(timeStr)) {
        return timeStr;
    }

    // Parse 12-hour format strings (e.g., "11:04 am", "02:30 pm")
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?$/i);
    if (match) {
        let [, hours, minutes, seconds = "00", modifier] = match;
        let h = parseInt(hours, 10);

        if (modifier) {
            const mod = modifier.toLowerCase();
            if (mod === "pm" && h < 12) h += 12;
            if (mod === "am" && h === 12) h = 0;
        }

        const formattedHours = String(h).padStart(2, "0");
        return `${formattedHours}:${minutes}:${seconds}`;
    }

    // Fallback to current local time in 24-hr format
    const now = new Date();
    return now.toTimeString().split(" ")[0];
};

/**
 * Helper function to generate current local 24-hr time string (HH:mm:ss)
 */
const getCurrentTimeString = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
};

/**
 * Helper function to generate current local date string (YYYY-MM-DD)
 */
const getCurrentDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

/**
 * Root Attendance Endpoint (Fixes frontend 404)
 * Handles queries: ?type=member|trainer & id=123 & month=8 & year=2026
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const { type, id, month, year } = req.query;

    if (!id) {
      return res.status(400).json({ success: false, message: "Target ID required" });
    }

    // Adjust query criteria based on your Attendance model fields
    const records = await Attendance.findAll({
      where: {
        member_id: id,
      },
    });

    return res.status(200).json({
      success: true,
      data: records || [],
    });
  } catch (error) {
    console.error("Attendance Fetch Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});

/**
 * Get Attendance for Individual Member or Trainer for Calendar
 * Query params: ?type=member|trainer & id=123 & month=2026-08
 */
router.get("/user-calendar", verifyToken, async (req, res) => {
    try {
        const { type, id, month } = req.query; // e.g. type="member", id=5, month="2026-08"

        if (!type || !id || !month) {
            return res.status(400).json({
                success: false,
                message: "type (member|trainer), id, and month (YYYY-MM) are required",
            });
        }

        const startDate = `${month}-01`;
        const [y, m] = month.split("-");
        const lastDayOfM = new Date(Number(y), Number(m), 0).getDate();
        const endDate = `${month}-${String(lastDayOfM).padStart(2, "0")}`;

        const whereClause = {
            attendance_date: {
                [Op.between]: [startDate, endDate],
            },
        };

        if (type === "member") {
            whereClause.member_id = id;
        } else if (type === "trainer") {
            whereClause.trainer_id = id;
        }

        const logs = await Attendance.findAll({
            where: whereClause,
            include: [
                { model: Member, attributes: ["id", "full_name"], required: false },
                { model: Trainer, attributes: ["id", "full_name"], required: false },
            ],
            order: [["attendance_date", "ASC"]],
        });

        // Format events for calendar frontend
        const events = logs.map((log) => ({
            id: log.id,
            title: `${log.check_in} - ${log.check_out || "Active"} (${log.status})`,
            date: log.attendance_date,
            status: log.status,
            check_in: log.check_in,
            check_out: log.check_out,
        }));

        return res.status(200).json({
            success: true,
            data: events,
        });
    } catch (error) {
        console.error("Calendar Attendance Fetch Error:", error);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});

/**
 * Search Members for Quick Front Desk Check-In
 */
router.get("/search-members", verifyToken, async (req, res) => {
    try {
        const { query = "" } = req.query;

        if (!query.trim()) {
            return res.status(200).json({ success: true, data: [] });
        }

        const members = await Member.findAll({
            where: {
                [Op.or]: [
                    { full_name: { [Op.like]: `%${query}%` } },
                    { phone: { [Op.like]: `%${query}%` } },
                    { id: isNaN(query) ? 0 : Number(query) },
                ],
            },
            attributes: ["id", "full_name", "phone"],
            limit: 10,
        });

        return res.status(200).json({
            success: true,
            data: members,
        });
    } catch (error) {
        console.error("Search Members Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

/**
 * 1-Click Toggle Check-In / Check-Out
 */
router.post("/toggle", verifyToken, async (req, res) => {
    try {
        const { member_id } = req.body;

        if (!member_id) {
            return res.status(400).json({
                success: false,
                message: "Member ID is required",
            });
        }

        const member = await Member.findByPk(member_id);
        if (!member) {
            return res.status(404).json({
                success: false,
                message: "Member not found",
            });
        }

        const today = getCurrentDateString();
        const currentTime = getCurrentTimeString();

        // Find or create today's attendance record
        const [attendance, created] = await Attendance.findOrCreate({
            where: {
                member_id,
                attendance_date: today,
            },
            defaults: {
                member_id,
                attendance_date: today,
                check_in: currentTime,
                status: "Present",
            },
        });

        // 1st Click: Member created and checked in
        if (created) {
            return res.status(201).json({
                success: true,
                action: "CHECK_IN",
                message: `${member.full_name || "Member"} checked in successfully`,
                data: attendance,
            });
        }

        // 2nd Click: Member exists and has not checked out yet
        if (!attendance.check_out) {
            attendance.check_out = currentTime;
            await attendance.save();

            return res.status(200).json({
                success: true,
                action: "CHECK_OUT",
                message: `${member.full_name || "Member"} checked out successfully`,
                data: attendance,
            });
        }

        // Subsequent Clicks: Member already completed check-in & check-out today
        return res.status(400).json({
            success: false,
            message: "Member has already checked in and out today",
        });
    } catch (error) {
        console.error("Toggle Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

/**
 * Add Attendance (Manual Add Endpoint)
 */
router.post("/add", verifyToken, async (req, res) => {
    try {
        const { member_id, check_in, check_out, status = "Present" } = req.body;

        if (!member_id) {
            return res.status(400).json({
                success: false,
                message: "Member is required",
            });
        }

        const today = getCurrentDateString();
        const formattedCheckIn = check_in ? formatToMySQLTime(check_in) : getCurrentTimeString();
        const formattedCheckOut = check_out ? formatToMySQLTime(check_out) : null;

        const existingAttendance = await Attendance.findOne({
            where: {
                member_id,
                attendance_date: today,
            },
        });

        if (existingAttendance) {
            return res.status(400).json({
                success: false,
                message: "Attendance already marked today",
            });
        }

        const attendance = await Attendance.create({
            member_id,
            attendance_date: today,
            check_in: formattedCheckIn,
            check_out: formattedCheckOut,
            status,
        });

        return res.status(201).json({
            success: true,
            message: "Attendance marked successfully",
            data: attendance,
        });
    } catch (error) {
        console.error("Add Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

/**
 * Get All Attendance Records (Paginated)
 */
router.get("/all", verifyToken, async (req, res) => {
    try {
        let {
            page = 1,
            limit = 10,
            search = "",
            attendance_date,
            status,
            sortBy = "created_at",
            order = "DESC",
        } = req.query;

        page = Number(page);
        limit = Number(limit);
        const offset = (page - 1) * limit;

        const allowedSortFields = [
            "created_at",
            "attendance_date",
            "check_in",
            "check_out",
            "status",
        ];

        const sortField = allowedSortFields.includes(sortBy)
            ? sortBy
            : "created_at";
        const sortOrder = order.toUpperCase() === "ASC" ? "ASC" : "DESC";

        const where = {};
        if (attendance_date) where.attendance_date = attendance_date;
        if (status) where.status = status;

        const { count, rows } = await Attendance.findAndCountAll({
            where,
            limit,
            offset,
            order: [[sortField, sortOrder]],
            include: [
                {
                    model: Member,
                    attributes: ["id", "full_name", "phone"],
                    where: search
                        ? { full_name: { [Op.like]: `%${search}%` } }
                        : undefined,
                    required: !!search,
                },
                {
                    model: Trainer,
                    attributes: ["id", "full_name"],
                    required: false,
                },
            ],
        });

        return res.status(200).json({
            success: true,
            message: "Attendance fetched successfully",
            data: rows,
            meta: {
                totalRecords: count,
                currentPage: page,
                pageSize: limit,
                totalPages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        console.error("Get All Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

/**
 * Get Single Attendance Record
 */
router.get("/:id", verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const attendance = await Attendance.findByPk(id, {
            include: [
                {
                    model: Member,
                    attributes: ["id", "full_name", "phone", "email"],
                    required: false,
                },
                {
                    model: Trainer,
                    attributes: ["id", "full_name"],
                    required: false,
                },
            ],
        });

        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Attendance fetched successfully",
            data: attendance,
        });
    } catch (error) {
        console.error("Get Attendance ID Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
});

/**
 * Update Attendance Record
 */
const handleUpdateAttendance = async (req, res) => {
    try {
        const { id } = req.params;

        const attendance = await Attendance.findByPk(id);
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance not found",
            });
        }

        const { check_in, check_out, status } = req.body;

        const updatedCheckIn = check_in ? formatToMySQLTime(check_in) : attendance.check_in;
        const updatedCheckOut = check_out !== undefined ? formatToMySQLTime(check_out) : attendance.check_out;

        await attendance.update({
            check_in: updatedCheckIn,
            check_out: updatedCheckOut,
            status: status || attendance.status,
        });

        return res.status(200).json({
            success: true,
            message: "Attendance updated successfully",
            data: attendance,
        });
    } catch (error) {
        console.error("Update Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

router.put("/update/:id", verifyToken, handleUpdateAttendance);
router.put("/:id", verifyToken, handleUpdateAttendance);

const handleDeleteAttendance = async (req, res) => {
    try {
        const { id } = req.params;

        const attendance = await Attendance.findByPk(id);
        if (!attendance) {
            return res.status(404).json({
                success: false,
                message: "Attendance not found",
            });
        }

        await attendance.destroy();

        return res.status(200).json({
            success: true,
            message: "Attendance deleted successfully",
        });
    } catch (error) {
        console.error("Delete Attendance Error:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

router.delete("/delete/:id", verifyToken, handleDeleteAttendance);
router.delete("/:id", verifyToken, handleDeleteAttendance);

export default router;