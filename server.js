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
import workoutPlanRoutes from "./routes/workoutPlan.js"; 
import paymentRoutes from "./routes/payment.js"; // 👈 Added payment routes import

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

// Members & Users
app.use("/api/member", memberRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/user", memberRoutes);  
app.use("/api/users", memberRoutes);

// Trainers
app.use("/api/trainer", trainerRoutes);
app.use("/api/trainers", trainerRoutes);

// Workout Plans
app.use("/api/workout-plan", workoutPlanRoutes);
app.use("/api/workoutPlan", workoutPlanRoutes);

// Diet Plans
app.use("/api/dietPlan", dietPlanRoutes);

// Attendance
app.use("/api/attendance", attendenceRouter);
app.use("/api/attendence", attendenceRouter);

// Membership Plans
app.use("/api/plans", membershipPlanRoutes);
app.use("/api/membership-plans", membershipPlanRoutes);
app.use("/api/membershipPlan", membershipPlanRoutes); 

// Payments
app.use("/api/payment", paymentRoutes);  
app.use("/api/payments", paymentRoutes);

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