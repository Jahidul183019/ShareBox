import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ----------------- LOCAL FALLBACK RISK ENGINE -----------------
export function calculateLocalRisk(data: any) {
  let htPoints = 10;
  let dbPoints = 10;

  // Age factor
  if (data.age > 60) {
    htPoints += 25;
    dbPoints += 20;
  } else if (data.age > 45) {
    htPoints += 15;
    dbPoints += 12;
  } else if (data.age > 30) {
    htPoints += 8;
    dbPoints += 5;
  }

  // Blood Pressure factors
  const sys = Number(data.systolic) || 120;
  const dia = Number(data.diastolic) || 80;
  if (sys >= 160 || dia >= 100) {
    htPoints += 45;
  } else if (sys >= 140 || dia >= 90) {
    htPoints += 35;
  } else if (sys >= 130 || dia >= 80) {
    htPoints += 20;
  } else if (sys >= 120) {
    htPoints += 5;
  }

  // BMI Factor
  const weight = Number(data.weight) || 70;
  const heightM = (Number(data.height) || 175) / 100;
  const bmi = weight / (heightM * heightM);

  if (bmi >= 35) {
    htPoints += 15;
    dbPoints += 30;
  } else if (bmi >= 30) {
    htPoints += 10;
    dbPoints += 24;
  } else if (bmi >= 25) {
    htPoints += 5;
    dbPoints += 14;
  }

  // Family History
  const fh = data.familyHistory || {};
  if (fh.hypertension) htPoints += 15;
  if (fh.stroke) htPoints += 10;
  if (fh.diabetes) dbPoints += 25;
  if (fh.heartDisease) {
    htPoints += 12;
    dbPoints += 8;
  }

  // Lifestyle Factors
  if (data.activityLevel === "low") {
    htPoints += 10;
    dbPoints += 15;
  } else if (data.activityLevel === "high") {
    htPoints -= 5;
    dbPoints -= 5;
  }

  if (data.dietQuality === "poor") {
    htPoints += 8;
    dbPoints += 12;
  } else if (data.dietQuality === "good") {
    htPoints -= 3;
    dbPoints -= 3;
  }

  if (data.saltIntake === "high") {
    htPoints += 15;
  }
  if (data.stressLevel === "high") {
    htPoints += 10;
    dbPoints += 8;
  }
  if (data.smoking) {
    htPoints += 12;
  }

  // 1. Gender baseline factor
  if (data.gender === "male") {
    htPoints += 4;
  }

  // 2. Fasting Blood Sugar (FBS)
  if (data.fastingBloodSugar === "high") {
    dbPoints += 30;
    htPoints += 8;
  } else if (data.fastingBloodSugar === "borderline") {
    dbPoints += 14;
    htPoints += 3;
  }

  // 3. Cholesterol Level
  if (data.cholesterol === "high") {
    htPoints += 20;
  }

  // 4. Sleep Duration
  if (data.sleepDuration === "insufficient") {
    htPoints += 8;
    dbPoints += 6;
  }

  // 5. Alcohol Consumption
  if (data.alcohol === "regular") {
    htPoints += 15;
    dbPoints += 8;
  } else if (data.alcohol === "occasional") {
    htPoints += 5;
  }

  const hypertensionRisk = Math.max(10, Math.min(htPoints, 95));
  const diabetesRisk = Math.max(10, Math.min(dbPoints, 95));
  const overallRisk = Math.round((hypertensionRisk + diabetesRisk) / 2);

  let overallRiskLabel: "Low" | "Medium" | "High" = "Medium";
  if (overallRisk < 35) {
    overallRiskLabel = "Low";
  } else if (overallRisk >= 70) {
    overallRiskLabel = "High";
  }

  const findings: string[] = [];
  const recommendations: string[] = [];

  // Generate basic findings
  if (sys >= 140 || dia >= 90) {
    findings.push("Blood pressure measurements indicate potential Stage 2 hypertension.");
    recommendations.push("Arrange clinical blood pressure confirmation program.");
  } else if (sys >= 130 || dia >= 80) {
    findings.push("Mild or Stage 1 elevation detected in blood pressure.");
    recommendations.push("Adopt a low-sodium, low-fat cardiac diet.");
  }

  if (bmi >= 30) {
    findings.push(`Elevated body weight metric (BMI is ${bmi.toFixed(1)}).`);
    recommendations.push("Increase caloric control and light home workouts.");
  }

  if (data.smoking) {
    findings.push("Active smoking habit contributes significant arterial strain.");
    recommendations.push("Prioritize complete tobacco cessation as a primary recovery step.");
  }

  if (data.saltIntake === "high") {
    findings.push("Diet includes high salt intake, which directly worsens blood vessel elasticity.");
    recommendations.push("Restrict tableside and processed salt completely (keep under 5g daily).");
  }

  // Fasting Blood Sugar Findings
  if (data.fastingBloodSugar === "high") {
    findings.push("Fasting Blood Sugar level is in diabetic range (>=126 mg/dL).");
    recommendations.push("Consult an endocrinologist for a diagnostic HbA1c screening.");
  } else if (data.fastingBloodSugar === "borderline") {
    findings.push("Fasting Blood Sugar level indicates pre-diabetic homeostatic stress (100 - 125 mg/dL).");
    recommendations.push("Introduce strict refined carbohydrates and sugar control.");
  }

  // Cholesterol Findings
  if (data.cholesterol === "high") {
    findings.push("Total cholesterol levels are elevated (>=200 mg/dL), elevating cardiovascular risk.");
    recommendations.push("Reduce saturated trans-fats and schedule a fasting lipid panel check.");
  }

  // Sleep findings
  if (data.sleepDuration === "insufficient") {
    findings.push("Average nightly sleep occurs in insufficient cycles (<6 hours), invoking nervous stress.");
    recommendations.push("Aim for 7-9 hours of standard deep quality sleep to cool arterial strain.");
  }

  // Alcohol findings
  if (data.alcohol === "regular") {
    findings.push("Regular alcohol exposure is reported, adding vessel stiffness and metabolic heat.");
    recommendations.push("Reduce alcohol consumption rate to bolster cardiac recovery index.");
  }

  if (fh.diabetes || fh.hypertension) {
    findings.push("Presence of immediate hereditary chronic risks in family history.");
    recommendations.push("Schedule semi-annual screening panels for preventative monitoring.");
  }

  if (findings.length === 0) {
    findings.push("Excellent overall metabolic and arterial biomarkers observed.");
  }
  if (recommendations.length === 0) {
    recommendations.push("Continue your positive hydration, custom diet, and workout habits!");
  }

  return {
    hypertensionRisk,
    diabetesRisk,
    overallRisk,
    overallRiskLabel,
    findings,
    recommendations,
  };
}

// ----------------- API ENDPOINTS -----------------

// API health endpoint
app.get("/api/health", (req, res) => {
  const isKeyAvailable = !!process.env.GEMINI_API_KEY;
  res.json({
    status: "ok",
    hasApiKey: isKeyAvailable,
  });
});

// Post Screening Assessment Endpoint
app.post("/api/assess", async (req, res) => {
  const data = req.body;
  const isKeyAvailable = !!process.env.GEMINI_API_KEY;

  if (!isKeyAvailable) {
    console.log("No GEMINI_API_KEY detected. Utilizing premium local fallback engine.");
    const risk = calculateLocalRisk(data);
    return res.json(risk);
  }

  try {
    const ai = getGeminiClient();
    const bmiVal = ((data.weight || 70) / (((data.height || 175) / 100) ** 2)).toFixed(1);

    const prompt = `Analyze the following patient health screening metrics and generate a structured health risk evaluation:
    - Age: ${data.age}
    - Gender (Biological): ${data.gender || "female"}
    - Systolic BP: ${data.systolic} mmHg
    - Diastolic BP: ${data.diastolic} mmHg
    - Height: ${data.height} cm
    - Weight: ${data.weight} kg
    - Calculated BMI: ${bmiVal}
    - Activity Level: ${data.activityLevel}
    - Family History: Diabetes=${data.familyHistory?.diabetes}, Hypertension=${data.familyHistory?.hypertension}, Stroke=${data.familyHistory?.stroke}, Heart Disease=${data.familyHistory?.heartDisease}
    - Salt Intake Level: ${data.saltIntake}
    - Fasting Blood Sugar: ${data.fastingBloodSugar || "normal"}
    - Total Cholesterol: ${data.cholesterol || "normal"}
    - Nightly Sleep Duration: ${data.sleepDuration || "optimal"}
    - Alcohol Consumption Frequency: ${data.alcohol || "never"}
    - Stress Level: ${data.stressLevel}
    - Smoking Status: ${data.smoking ? "Active Smoker" : "Non-smoker"}
    - Diet Quality: ${data.dietQuality}

    Return a structured JSON risk evaluation matching the specified schema. Keep findings and recommendations practical, supportive, and specifically tailored for early non-communicable disease (NCD) screening awareness in Bangladesh.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are a professional medical risk analyzer specializing in cardiovascular and metabolic diseases. Provide exact, scientifically sound estimations of hypertension and diabetes risks. Always reply constructingly and precisely.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hypertensionRisk: {
              type: Type.INTEGER,
              description: "Estimated percentage of hypertension/CVD risk (10 to 95)",
            },
            diabetesRisk: {
              type: Type.INTEGER,
              description: "Estimated percentage of Type 2 Diabetes risk (10 to 95)",
            },
            overallRisk: {
              type: Type.INTEGER,
              description: "An overall risk rating combining both metrics (10 to 95)",
            },
            overallRiskLabel: {
              type: Type.STRING,
              enum: ["Low", "Medium", "High"],
              description: "Overall risk severity level",
            },
            findings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Critical diagnostic and lifestyle findings based on input metrics",
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Concise, actionable preventive health and dietary actions",
            },
          },
          required: ["hypertensionRisk", "diabetesRisk", "overallRisk", "overallRiskLabel", "findings", "recommendations"],
        },
      },
    });

    const resultText = response.text;
    if (resultText) {
      const parsedResult = JSON.parse(resultText.trim());
      return res.json(parsedResult);
    } else {
      throw new Error("Empty AI response received.");
    }
  } catch (err: any) {
    console.error("Gemini assess failed, using local risk engine fallback:", err.message);
    const fallbackRisk = calculateLocalRisk(data);
    return res.json(fallbackRisk);
  }
});

// Chatbot Assist endpoint
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;
  const apiKey = process.env.CHATBOT_API_KEY || process.env.GEMINI_API_KEY;
  const isKeyAvailable = !!apiKey;

  if (!isKeyAvailable) {
    return res.json({
      text: "Hello! I am your VitalCare Assistant. (Demo Mode: CHATBOT_API_KEY or GEMINI_API_KEY is not configured yet in the Settings secrets). In this preview, I can guide you through using the app! You can navigate to Home to inspect the dashboard, or head to the 'Assess' tab at the top or bottom to initiate a live hypertension and diabetes screening assessment. Once completed, your live risk gauge, insights, and actions will update beautifully! Please consult a real doctor for clinical diagnosis.",
    });
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey! });

    // Map message history to standard schema
    const formattedContents = messages.map((m: any) => ({
      role: m.sender === "user" ? "user" : "model",
      parts: [{ text: m.text }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: formattedContents,
      config: {
        systemInstruction: `You are VitalCare Assistant, an empathetic, highly specialized and professional medical information assistant for non-communicable disease (NCD) preventative screening (including diabetes, high blood pressure, CVD, diet, cardiac workloads, and lifestyle modifications) in Bangladesh. 

        CRITICAL HEALTHCARE BOT RULES:
        - Maintain a humble, professional, clear, and clinical precision tone at all times.
        - Encourage healthy diets (low-salt, low-starch, whole foods), exercise (150 minutes weekly of brisk walks), and routine medical evaluations.
        - You must always state that your advice is for informational and screening awareness purposes only, and cannot substitute for a licensed professional physician or formal medical diagnosis.
        - If the user asks in Bengali (বাংলা), respond in perfect, warm and natural Bengali. E.g., using polite 'আপনি' address.
        - Keep your paragraphs clear, readable, and highly focused. Limit responses to around 150-200 words.`,
      },
    });

    return res.json({
      text: response.text || "I was unable to generate a response. Please try again.",
    });
  } catch (err: any) {
    console.error("Gemini chat failed:", err.message);
    return res.status(500).json({
      error: "AI service is currently unavailable. Please verify your CHATBOT_API_KEY settings.",
    });
  }
});


// ----------------- VITE / STATIC MIDDLWARE MOUNT -----------------

async function mountViteOrStatic() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting in development mode with Vite hot middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting in production mode serving static dist files...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server launched successfully. Listening at http://0.0.0.0:${PORT}`);
  });
}

mountViteOrStatic();
