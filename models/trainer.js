import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Trainer = sequelize.define(
    "Trainer",
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

        phone: {
            type: DataTypes.STRING(15),
            allowNull: false,
            unique: true,
            validate: {
                len: [10, 15],
            },
        },

        email: {
            type: DataTypes.STRING,
            allowNull: true,
            unique: true,
            validate: {
                isEmail: true,
            },
        },

        specialization: {
            type: DataTypes.STRING,
            allowNull: true,
        },

        experience: {
            type: DataTypes.INTEGER,
            allowNull: true,
        },

        salary: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
        },

        joining_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
        },

        status: {
            type: DataTypes.ENUM("active", "inactive"),
            defaultValue: "active",
        },
    },
    {
        tableName: "trainers",
        timestamps: true,
        createdAt: "created_at",
        updatedAt: "updated_at",
    }
);

export default Trainer;