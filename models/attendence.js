import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Attendance = sequelize.define(
  "Attendance",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "members", // Table name for Members
        key: "id",
      },
      onDelete: "CASCADE",
    },

    trainer_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "trainers", // Table name for Trainers
        key: "id",
      },
      onDelete: "SET NULL",
    },

    attendance_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    check_in: {
      type: DataTypes.TIME,
      allowNull: false,
    },

    check_out: {
      type: DataTypes.TIME,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM("Present", "Absent", "Late"),
      defaultValue: "Present",
    },
  },
  {
    tableName: "attendance",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      // Enforce 1 record per member per day
      {
        unique: true,
        fields: ["member_id", "attendance_date"],
        name: "unique_member_daily_attendance",
      },
      // Fast lookups for daily attendance reports
      {
        fields: ["attendance_date"],
      },
    ],
  }
);

export default Attendance;