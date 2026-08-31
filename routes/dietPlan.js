import express from "express";
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import DietPlan from "../models/dietPlan.js";
import Member from "../models/member.js"; // Adjust import path to your Member model
import verifyToken from "../middleware/verifyToken.js";

const router = express.Router();

router.post("/generate", verifyToken, async (req, res) => {
    console.log("Generating diet plan with OpenRouter...");

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

        if (!member_id) {
            return res.status(400).json({
                success: false,
                message: "member_id is required.",
            });
        }

        // Optional: Fetch Member details for personalized output
        const member = await Member.findByPk(member_id).catch(() => null);
        const memberName = member?.full_name || `Member #${member_id}`;

        const heightMeters = height_cm / 100;
        const bmi = (weight_kg / (heightMeters * heightMeters)).toFixed(1);

        const prompt = `
Create a tailored Diet and Nutrition Plan for a gym member.

User Details:
- Height: ${height_cm} cm
- Weight: ${weight_kg} kg (BMI: ${bmi})
- Fitness Goal: ${fitness_goal}
- Diet Preference: ${diet_preference}
- Experience Level: ${experience_level}
- Days per Week: ${workout_days}

Return strictly valid JSON using this exact format without markdown or extra text:
{
  "planOverview": "Brief overview of the diet strategy and caloric target reasoning",
  "dailyCalories": 2200,
  "macros": {
    "protein": "160g",
    "carbs": "200g",
    "fats": "60g"
  },
  "meals": [
    {
      "mealName": "Breakfast",
      "time": "8:00 AM",
      "items": [
        { "food": "Oatmeal with whey protein", "portion": "1 cup cooked + 1 scoop whey", "calories": 350 }
      ]
    },
    {
      "mealName": "Lunch",
      "time": "1:00 PM",
      "items": [
        { "food": "Grilled chicken breast with quinoa and broccoli", "portion": "150g chicken, 1 cup quinoa, 1 cup broccoli", "calories": 550 }
      ]
    },
    {
      "mealName": "Snack",
      "time": "4:30 PM",
      "items": [
        { "food": "Greek yogurt with almonds", "portion": "200g yogurt + 15g almonds", "calories": 250 }
      ]
    },
    {
      "mealName": "Dinner",
      "time": "8:00 PM",
      "items": [
        { "food": "Salmon with sweet potato and asparagus", "portion": "150g salmon, 150g sweet potato", "calories": 500 }
      ]
    }
  ],
  "hydration": "Drink at least 3-4 liters of water daily",
  "supplements": ["Whey Protein", "Creatine Monohydrate", "Multivitamin"]
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

        let rawContent = response.choices[0].message.content;

        // Clean potential markdown delimiters returned by free models
        rawContent = rawContent.replace(/```json\s*/g, "").replace(/```\s*$/g, "").trim();
        const planData = JSON.parse(rawContent);


        // Set Response Headers for Inline PDF View
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `inline; filename="diet-plan-${member_id}.pdf"`
        );

        // Document Generation
        const doc = new PDFDocument({ margin: 40, bufferPages: true });
        doc.pipe(res);

        const primaryColor = "#1A365D";
        const secondaryColor = "#2B6CB0";
        const textColor = "#2D3748";
        const mutedColor = "#718096";

        // Header Title
        doc
            .fillColor(primaryColor)
            .font("Helvetica-Bold")
            .fontSize(20)
            .text("GYM MANAGEMENT", { align: "center" })
            .fontSize(14)
            .fillColor(secondaryColor)
            .text("AI-POWERED DIET & NUTRITION PLAN", { align: "center" })
            .moveDown(0.8);

        // Member Metadata Block
        const metaStartY = doc.y;
        doc.fontSize(9).fillColor(textColor);

        doc
            .font("Helvetica-Bold").text("Member: ", 40, metaStartY, { continued: true })
            .font("Helvetica").text(`${memberName}   |   `, { continued: true })
            .font("Helvetica-Bold").text("Goal: ", { continued: true })
            .font("Helvetica").text(`${fitness_goal}   |   `, { continued: true })
            .font("Helvetica-Bold").text("Preference: ", { continued: true })
            .font("Helvetica").text(`${diet_preference}`);

        doc
            .font("Helvetica-Bold").text("Height: ", 40, doc.y + 4, { continued: true })
            .font("Helvetica").text(`${height_cm} cm   |   `, { continued: true })
            .font("Helvetica-Bold").text("Weight: ", { continued: true })
            .font("Helvetica").text(`${weight_kg} kg   |   `, { continued: true })
            .font("Helvetica-Bold").text("BMI: ", { continued: true })
            .font("Helvetica").text(`${bmi}   |   `, { continued: true })
            .font("Helvetica-Bold").text("Days/Wk: ", { continued: true })
            .font("Helvetica").text(`${workout_days}`);

        doc.moveDown(0.8);
        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor("#E2E8F0").lineWidth(1).stroke();
        doc.moveDown(0.8);

        // Strategy Overview
        doc
            .font("Helvetica-Bold")
            .fillColor(secondaryColor)
            .fontSize(12)
            .text("Plan Overview")
            .moveDown(0.2);

        doc
            .font("Helvetica")
            .fillColor(textColor)
            .fontSize(9.5)
            .text(planData.planOverview || "Custom nutrition strategy based on your profile.")
            .moveDown(0.8);

        // Daily Macro Targets
        doc
            .font("Helvetica-Bold")
            .fillColor(secondaryColor)
            .fontSize(12)
            .text("Daily Target Summary")
            .moveDown(0.3);

        doc
            .font("Helvetica-Bold")
            .fontSize(10)
            .fillColor(textColor)
            .text(`Daily Calories: `, { continued: true })
            .font("Helvetica")
            .text(`${planData.dailyCalories || "N/A"} kcal   |   `, { continued: true })
            .font("Helvetica-Bold")
            .text(`Protein: `, { continued: true })
            .font("Helvetica")
            .text(`${planData.macros?.protein || "N/A"}   |   `, { continued: true })
            .font("Helvetica-Bold")
            .text(`Carbs: `, { continued: true })
            .font("Helvetica")
            .text(`${planData.macros?.carbs || "N/A"}   |   `, { continued: true })
            .font("Helvetica-Bold")
            .text(`Fats: `, { continued: true })
            .font("Helvetica")
            .text(`${planData.macros?.fats || "N/A"}`)
            .moveDown(0.8);

        doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor("#E2E8F0").lineWidth(1).stroke();
        doc.moveDown(0.8);

        // Meal Schedule
        doc
            .font("Helvetica-Bold")
            .fillColor(secondaryColor)
            .fontSize(12)
            .text("Daily Meal Schedule")
            .moveDown(0.5);

        if (Array.isArray(planData.meals)) {
            planData.meals.forEach((meal) => {
                doc
                    .font("Helvetica-Bold")
                    .fillColor(primaryColor)
                    .fontSize(10)
                    .text(`${meal.mealName} (${meal.time})`)
                    .moveDown(0.2);

                if (Array.isArray(meal.items)) {
                    meal.items.forEach((item) => {
                        doc
                            .font("Helvetica")
                            .fillColor(textColor)
                            .fontSize(9)
                            .text(`  • ${item.food} `, { continued: true })
                            .fillColor(mutedColor)
                            .text(`— ${item.portion} (${item.calories} kcal)`);
                    });
                }
                doc.moveDown(0.6);
            });
        }

        // Hydration & Supplements Footer Block
        if (planData.hydration || planData.supplements) {
            doc.moveTo(40, doc.y).lineTo(550, doc.y).strokeColor("#E2E8F0").lineWidth(1).stroke();
            doc.moveDown(0.8);

            if (planData.hydration) {
                doc
                    .font("Helvetica-Bold")
                    .fillColor(secondaryColor)
                    .fontSize(10)
                    .text("Hydration: ", { continued: true })
                    .font("Helvetica")
                    .fillColor(textColor)
                    .text(planData.hydration)
                    .moveDown(0.3);
            }

            if (Array.isArray(planData.supplements) && planData.supplements.length > 0) {
                doc
                    .font("Helvetica-Bold")
                    .fillColor(secondaryColor)
                    .fontSize(10)
                    .text("Recommended Supplements: ", { continued: true })
                    .font("Helvetica")
                    .fillColor(textColor)
                    .text(planData.supplements.join(", "));
            }
        }

        // Dynamic Page Numbering
        const range = doc.bufferedPageRange();
        for (let i = range.start; i < range.start + range.count; i++) {
            doc.switchToPage(i);
            doc
                .font("Helvetica")
                .fontSize(8)
                .fillColor(mutedColor)
                .text(
                    `Page ${i + 1} of ${range.count}`,
                    40,
                    doc.page.height - 30,
                    { align: "center", width: 512 }
                );
        }

        doc.end();
    } catch (error) {
        console.error("Error generating PDF:", error);
        if (!res.headersSent) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate Diet plan PDF",
                error: error.message,
            });
        }
    }
});

export default router;