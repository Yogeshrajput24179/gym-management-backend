import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import sequelize from "./config/db.js";
import authRoutes from "./routes/auth.js";
import "./models/sequelizeModels.js";
import memberRoutes from "./routes/member.js";
import trainerRoutes from "./routes/trainer.js";
import attendenceRouter from "./routes/attendence.js";
import membershipPlanRoutes from "./routes/membershipPlan.js";
import dietPlanRoutes from "./routes/dietPlan.js";

// ❌ OLD: import workoutPlanRoutes from "./models/workoutPlan.js";
// ✅ NEW: Import from the routes directory instead of models
import workoutPlanRoutes from "./routes/workoutPlan.js"; 

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

// Mount members (singular and plural)
app.use("/api/member", memberRoutes);
app.use("/api/members", memberRoutes);

// Mount trainers (singular and plural)
app.use("/api/trainer", trainerRoutes);
app.use("/api/trainers", trainerRoutes);

// Mount workout plans (support both kebab-case and camelCase)
app.use("/api/workout-plan", workoutPlanRoutes);
app.use("/api/workoutPlan", workoutPlanRoutes);

// Mount diet plans (support both kebab-case and camelCase)
app.use("/api/dietPlan", dietPlanRoutes);

// Mount attendance (support both spellings)
app.use("/api/attendance", attendenceRouter);
app.use("/api/attendence", attendenceRouter);

// Mount membership plans (support /plans and /membershipplan)
app.use("/api/plans", membershipPlanRoutes);
app.use("/api/membership-plans", membershipPlanRoutes);

// Fix "Failed to fetch users" by pointing /api/users to memberRoutes
app.use("/api/users", memberRoutes);

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database Connected Successfully");
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database Connection Failed:", error);
  }
}

startServer();