import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const MembershipPlan = sequelize.define(
    "MembershipPlan",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        plan_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },

        duration: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        status: {
            type: DataTypes.ENUM("active", "inactive"),
            defaultValue: "active",
        },
    },
    {
        tableName: "membership_plans",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default MembershipPlan;