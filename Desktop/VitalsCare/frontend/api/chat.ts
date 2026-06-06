import { GoogleGenAI } from "@google/genai";

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { messages } = req.body || {};
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages format' });
  }

  const apiKey = process.env.CHATBOT_API_KEY;
  const isKeyAvailable = !!apiKey;

  if (!isKeyAvailable) {
    return res.status(200).json({
      text: "Hello! I am your VitalCare Assistant. (Demo Mode: CHATBOT_API_KEY is not configured yet in the Settings secrets). In this preview, I can guide you through using the app! You can navigate to Home to inspect the dashboard, or head to the 'Assess' tab at the top or bottom to initiate a live hypertension and diabetes screening assessment. Once completed, your live risk gauge, insights, and actions will update beautifully! Please consult a real doctor for clinical diagnosis.",
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

    return res.status(200).json({
      text: response.text || "I was unable to generate a response. Please try again.",
    });
  } catch (err: any) {
    console.error("Gemini chat failed:", err.message);
    return res.status(500).json({
      error: "AI service is currently unavailable. Please verify your CHATBOT_API_KEY settings.",
    });
  }
}
