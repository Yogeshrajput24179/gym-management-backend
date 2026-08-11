import express from "express";
import OpenAI from "openai";
import PDFDocument from "pdfkit";

const router = express.Router();

router.post("/generate", async (req, res) => {
  console.log("Generating workout plan with OpenRouter...");

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      success: false,
      message: "OPENROUTER_API_KEY is missing in .env file.",
    });
  }

  const openai = new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey,
  });

  try {
    const {
      member_id,
      height_cm,
      weight_kg,
      diet_preference = "Standard",
      fitness_goal = "General Fitness",
      experience_level = "Intermediate",
      workout_days = 5,
    } = req.body;

    const heightMeters = height_cm / 100;
    const bmi = (weight_kg / (heightMeters * heightMeters)).toFixed(1);

    const prompt = `
      Create a tailored workout and nutrition plan for a gym member.
      User Details:
      - Height: ${height_cm} cm
      - Weight: ${weight_kg} kg (BMI: ${bmi})
      - Fitness Goal: ${fitness_goal}
      - Diet Preference: ${diet_preference}
      - Experience Level: ${experience_level}
      - Days per Week: ${workout_days}

      Return strictly valid JSON using this exact format:
      {
        "planOverview": "Brief overview of the strategy",
        "dailyCalories": 2200,
        "macros": { "protein": "160g", "carbs": "200g", "fats": "60g" },
        "schedule": [
          {
            "day": "Day 1",
            "focus": "Chest & Triceps",
            "exercises": [
              { "name": "Bench Press", "sets": 4, "reps": "8-10", "rest": "90s" }
            ]
          }
        ]
      }
    `;

    const response = await openai.chat.completions.create({
      model: "openrouter/free",
      messages: [
        {
          role: "system",
          content:
            "You are a professional fitness trainer and nutritionist. Respond ONLY in valid JSON.",
        },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const planData = JSON.parse(response.choices[0].message.content);

    // Set Response Headers for PDF Preview in Browser
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `inline; filename="workout-plan-${member_id || "guest"}.pdf"`
    );

    // Create PDF Document
    const doc = new PDFDocument({ margin: 40 });
    doc.pipe(res); // Stream directly to HTTP response

    // Title & Header
    doc
      .fillColor("#1A365D")
      .fontSize(22)
      .text("GYM MANAGEMENT - AI WORKOUT PLAN", { align: "center" })
      .moveDown(0.5);

    doc
      .fillColor("#333333")
      .fontSize(10)
      .text(`Member ID: ${member_id || "N/A"} | Goal: ${fitness_goal} | Days/Week: ${workout_days}`)
      .text(`Height: ${height_cm} cm | Weight: ${weight_kg} kg | BMI: ${bmi}`)
      .moveDown(1);

    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke("#CCCCCC").moveDown(1);

    // Overview Section
    doc.fillColor("#2B6CB0").fontSize(14).text("Plan Overview").moveDown(0.3);
    doc.fillColor("#4A5568").fontSize(10).text(planData.planOverview).moveDown(1);

    // Nutrition & Macros
    doc.fillColor("#2B6CB0").fontSize(14).text("Daily Nutrition Targets").moveDown(0.3);
    doc
      .fillColor("#2D3748")
      .fontSize(10)
      .text(`Daily Calories: ${planData.dailyCalories} kcal`)
      .text(
        `Macros - Protein: ${planData.macros?.protein || "N/A"}, Carbs: ${planData.macros?.carbs || "N/A"}, Fats: ${planData.macros?.fats || "N/A"}`
      )
      .moveDown(1);

    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke("#CCCCCC").moveDown(1);

    // Workout Schedule
    doc.fillColor("#2B6CB0").fontSize(14).text("Weekly Workout Schedule").moveDown(0.5);

    if (Array.isArray(planData.schedule)) {
      planData.schedule.forEach((dayItem) => {
        doc
          .fillColor("#1A202C")
          .fontSize(11)
          .text(`${dayItem.day} - Focus: ${dayItem.focus}`, { underline: true })
          .moveDown(0.3);

        if (Array.isArray(dayItem.exercises)) {
          dayItem.exercises.forEach((ex) => {
            doc
              .fillColor("#4A5568")
              .fontSize(9)
              .text(`  • ${ex.name} | ${ex.sets} sets x ${ex.reps} reps | Rest: ${ex.rest}`);
          });
        }
        doc.moveDown(0.8);
      });
    }

    doc.end(); // Finalize PDF creation
  } catch (error) {
    console.error("Error generating PDF:", error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate workout plan PDF",
        error: error.message,
      });
    }
  }
});

export default router;