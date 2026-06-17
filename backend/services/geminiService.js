const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class GeminiService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  // Detect irrelevant/spam complaints
  async detectIrrelevantComplaint(title, description) {
    try {
      const prompt = `You are a content moderator for a civic complaint management system.

Analyze if this is a VALID civic complaint or IRRELEVANT/SPAM.

Title: "${title}"
Description: "${description}"

A VALID complaint is about:
- Road issues (potholes, signals, streetlights)
- Water supply/drainage issues
- Electricity problems
- Sanitation/garbage issues
- Public infrastructure problems

IRRELEVANT/SPAM includes:
- Personal disputes
- Commercial advertisements
- Random text or gibberish
- Abusive language
- Political propaganda
- Unrelated topics (sports, entertainment, etc.)
- Test messages
- Duplicate/meaningless content

Respond ONLY in this JSON format:
{
  "isRelevant": true/false,
  "confidence": 0.95,
  "reason": "Brief explanation",
  "category": "spam/personal/test/advertisement/valid"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return analysis;
      }
      
      return {
        isRelevant: true,
        confidence: 0.5,
        reason: 'Unable to verify',
        category: 'unknown'
      };
      
    } catch (error) {
      console.error('Spam Detection Error:', error);
      return {
        isRelevant: true,
        confidence: 0.5,
        reason: 'Detection unavailable',
        category: 'unknown'
      };
    }
  }

  // Comprehensive complaint analysis (ENHANCED)
  async analyzeComplaint(title, description) {
    try {
      // First check if relevant
      const relevanceCheck = await this.detectIrrelevantComplaint(title, description);
      
      if (!relevanceCheck.isRelevant && relevanceCheck.confidence > 0.7) {
        return {
          isRelevant: false,
          reason: relevanceCheck.reason,
          category: relevanceCheck.category,
          department: null,
          priority: null,
          summary: 'Complaint flagged as irrelevant'
        };
      }

      const prompt = `
You are an expert AI assistant for a municipal civic complaint system.

COMPLAINT:
Title: "${title}"
Description: "${description}"

Provide detailed analysis in JSON format:

{
  "isRelevant": true,
  "department": "Road/Water/Electricity/Sanitation",
  "priority": "High/Medium/Low",
  "summary": "2-sentence staff summary",
  "severityScore": 1-10,
  "estimatedResolutionTime": "e.g., 2-3 days",
  "keywords": ["keyword1", "keyword2"],
  "requiresImmediateAttention": true/false,
  "suggestedActions": ["action1", "action2"],
  "sentiment": "angry/frustrated/neutral/polite",
  "urgencyLevel": "critical/high/medium/low"
}`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        return {
          ...analysis,
          isRelevant: true
        };
      }
      
      return {
        isRelevant: true,
        department: 'Road',
        priority: 'Medium',
        summary: 'Complaint requires manual review',
        severityScore: 5,
        estimatedResolutionTime: '3-5 days',
        keywords: ['civic', 'issue'],
        requiresImmediateAttention: false,
        suggestedActions: ['Review complaint', 'Assign to team'],
        sentiment: 'neutral',
        urgencyLevel: 'medium'
      };
      
    } catch (error) {
      console.error('Gemini Analysis Error:', error);
      return {
        isRelevant: true,
        department: 'Road',
        priority: 'Medium',
        summary: 'AI analysis unavailable',
        severityScore: 5,
        estimatedResolutionTime: 'Unknown',
        keywords: [],
        requiresImmediateAttention: false,
        suggestedActions: [],
        sentiment: 'neutral',
        urgencyLevel: 'medium'
      };
    }
  }

  // Generate insights for admin
  async generateInsights(complaints) {
    try {
      const complaintSummary = complaints.slice(0, 50).map(c => ({
        department: c.department,
        status: c.status,
        priority: c.priority,
        age: Math.floor((Date.now() - new Date(c.createdAt)) / (1000 * 60 * 60))
      }));

      const prompt = `Analyze these civic complaint statistics and provide 4-5 key insights:

${JSON.stringify(complaintSummary, null, 2)}

Provide insights about:
1. Performance trends
2. Areas needing attention
3. Department efficiency
4. Priority distribution
5. Actionable recommendations

Keep response under 250 words, be specific with numbers.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
      
    } catch (error) {
      console.error('Insights Generation Error:', error);
      return 'Unable to generate insights at this time. Please review the data manually.';
    }
  }
}

module.exports = new GeminiService();