import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Payment = sequelize.define(
    "Payment",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },

        member_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        membership_plan_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },

        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },

        payment_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        payment_method: {
            type: DataTypes.ENUM(
                "Cash",
                "UPI",
                "Card",
                "Net Banking"
            ),
            allowNull: false,
        },

        transaction_id: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        status: {
            type: DataTypes.ENUM(
                "Paid",
                "Pending",
                "Failed"
            ),
            defaultValue: "Paid",
        },

        remarks: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
    },
    {
        tableName: "payments",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default Payment;