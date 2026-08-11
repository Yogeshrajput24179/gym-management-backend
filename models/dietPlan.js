import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const DietPlan = sequelize.define(
  "DietPlan",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    member_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    height_cm: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    weight_kg: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    diet_preference: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    fitness_goal: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    plan_data: {
      type: DataTypes.JSON,
      allowNull: false,
    },
  },
  {
    tableName: "diet_plans",
    timestamps: true,
  }
);

export default DietPlan;