const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

export const geminiService = {
  async analyzeComplaint(title, description) {
    try {
      const prompt = `
You are an AI assistant for a citizen complaint system.

Analyze the complaint and return JSON ONLY with:
- department (Road, Water, Electricity, Sanitation)
- priority (High, Medium, Low)
- category
- summary
- suggestedAction
- estimatedResolutionTime

Complaint Title: ${title}
Complaint Description: ${description}
`;

      const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
        }),
      });

      const result = await response.json();

      const text =
        result?.candidates?.[0]?.content?.parts?.[0]?.text || "";

      // Extract JSON safely
      const jsonMatch = text.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error("Invalid AI response");
      }

      const data = JSON.parse(jsonMatch[0]);

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error("Gemini AI Error:", error);

      return {
        success: false,
        error: error.message,
      };
    }
  },
};
