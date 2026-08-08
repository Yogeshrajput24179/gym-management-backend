import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Member = sequelize.define(
    "Member",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        full_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        gender: {
            type: DataTypes.ENUM("male", "female", "other"),
            allowNull: false,
        },

        dob: {
            type: DataTypes.DATEONLY,
            allowNull: true,
        },

        phone: {
            type: DataTypes.STRING(15),
            allowNull: false,
            unique: true,
        },

        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
        },

        address: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        emergency_contact: {
            type: DataTypes.STRING(15),
            allowNull: true,
        },

        membership_plan_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        trainer_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        joining_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        expiry_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        status: {
            type: DataTypes.ENUM("active", "inactive"),
            defaultValue: "active",
        },
    },
    {
        tableName: "members",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default Member;