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
import paymentRoutes from "./routes/payment.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(
  cors({
    origin: [
      "https://gym-management-frontend-lime.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000"
    ],
    credentials: true,
  })
);
app.use(express.json());

// Root Route (Health Check for Render)
app.get("/", (req, res) => {
  res.status(200).json({ message: "Gym Management API is running running successfully!" });
});

// Auth Routes
app.use("/api/auth", authRoutes);
app.use("/auth", authRoutes);

// Members & Users
app.use("/api/member", memberRoutes);
app.use("/api/members", memberRoutes);

// Trainers
app.use("/api/trainer", trainerRoutes);
app.use("/api/trainers", trainerRoutes);

// Workout Plans
app.use("/api/workout-plan", workoutPlanRoutes);
app.use("/api/workoutPlan", workoutPlanRoutes);

// Diet Plans
app.use("/api/dietPlan", dietPlanRoutes);
app.use("/api/diet-plan", dietPlanRoutes);

// Attendance
app.use("/api/attendance", attendenceRouter);
app.use("/api/attendence", attendenceRouter);

// Membership Plans
app.use("/api/plans", membershipPlanRoutes);
app.use("/api/membership-plans", membershipPlanRoutes);

// Payments
app.use("/api/payment", paymentRoutes);  
app.use("/api/payments", paymentRoutes);

// Handle non-existent endpoints
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.originalUrl}` });
});

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("✅ Database Connected Successfully");

    // Safe sync for production
    await sequelize.sync();
    console.log("✅ Database Models Synced");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("❌ Database Connection Failed:", error);
  }
}

startServer();