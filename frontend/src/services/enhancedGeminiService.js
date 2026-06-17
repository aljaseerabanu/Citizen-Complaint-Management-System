const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * Enhanced Gemini AI Service for Complaint Management System
 * Provides comprehensive AI-powered analysis and recommendations
 */
export const enhancedGeminiService = {
  
  /**
   * 1. COMPREHENSIVE COMPLAINT ANALYSIS
   * Analyzes complaint and provides detailed categorization
   */
  analyzeComplaint: async (title, description, imageBase64 = null) => {
    const prompt = `
You are an AI assistant for a Government Citizen Complaint Management System in India.

Analyze the following citizen complaint and provide ONLY a valid JSON response.

COMPLAINT DETAILS:
Title: ${title}
Description: ${description}

CLASSIFICATION RULES:
1. DEPARTMENT:
   - Road: potholes, road damage, traffic signals, street lights, road construction, drainage on roads
   - Water: water supply, pipe leakage, water quality, sewage, drainage blocks, water pressure
   - Electricity: power outage, street lights, electric poles, transformer issues, cable damage
   - Sanitation: garbage collection, waste management, public toilets, littering, cleanliness

2. PRIORITY (based on severity):
   - High: Safety hazards, health risks, affecting many people, infrastructure failure
   - Medium: Significant issues, community-wide problems, service disruption
   - Low: Minor issues, cosmetic problems, routine maintenance

3. URGENCY LEVEL:
   - Critical: Immediate danger, emergency response needed
   - High: Action needed within 24 hours
   - Medium: Action needed within 3 days
   - Low: Action needed within 1 week

4. CATEGORY (specific issue type)
5. ESTIMATED RESOLUTION TIME (realistic timeline)
6. REQUIRED RESOURCES (what's needed to fix)
7. SUGGESTED ACTION (specific steps for staff)
8. KEYWORDS (for search and filtering)

Return ONLY this JSON structure (no markdown, no explanation):
{
  "department": "one of: Road, Water, Electricity, Sanitation",
  "priority": "one of: High, Medium, Low",
  "urgency": "one of: Critical, High, Medium, Low",
  "category": "specific issue category",
  "summary": "brief 2-3 sentence summary",
  "detailedAnalysis": "comprehensive analysis of the issue",
  "suggestedAction": "specific actionable steps for staff",
  "estimatedResolutionTime": "realistic timeframe (e.g., '2-3 days')",
  "requiredResources": ["list", "of", "resources", "needed"],
  "affectedPopulation": "estimated number of people affected",
  "riskLevel": "one of: Critical, High, Medium, Low",
  "preventiveMeasures": "suggestions to prevent similar issues",
  "keywords": ["keyword1", "keyword2", "keyword3"]
}
`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status}`);
      }

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;
      
      if (!text) {
        throw new Error('No response from Gemini AI');
      }

      let jsonText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      const analysis = JSON.parse(jsonText);

      return {
        success: true,
        data: {
          department: analysis.department || 'Road',
          priority: analysis.priority || 'Medium',
          urgency: analysis.urgency || 'Medium',
          category: analysis.category || 'General Issue',
          summary: analysis.summary || description.substring(0, 150),
          detailedAnalysis: analysis.detailedAnalysis || '',
          suggestedAction: analysis.suggestedAction || 'Assess and take appropriate action',
          estimatedResolutionTime: analysis.estimatedResolutionTime || '3-5 days',
          requiredResources: analysis.requiredResources || [],
          affectedPopulation: analysis.affectedPopulation || 'Unknown',
          riskLevel: analysis.riskLevel || 'Medium',
          preventiveMeasures: analysis.preventiveMeasures || '',
          keywords: analysis.keywords || []
        }
      };

    } catch (error) {
      console.error('Gemini analysis error:', error);
      return {
        success: false,
        data: fallbackAnalysis(title, description),
        error: error.message
      };
    }
  },

  /**
   * 2. STAFF RESPONSE GENERATOR
   * Generates professional responses for staff to communicate with citizens
   */
  generateStaffResponse: async (complaint, currentStatus, action = 'update') => {
    const prompt = `
You are helping government staff communicate with citizens about their complaint.

COMPLAINT: ${complaint.title}
DESCRIPTION: ${complaint.description}
CURRENT STATUS: ${currentStatus}
DEPARTMENT: ${complaint.department}

Generate a professional, empathetic response in both ENGLISH and the LOCAL LANGUAGE (if applicable).

The response should:
1. Acknowledge the complaint professionally
2. Explain current status and actions taken
3. Provide timeline for resolution
4. Be courteous and reassuring
5. Include contact information if follow-up needed

Return ONLY this JSON:
{
  "responseTemplate": "professional response text",
  "localLanguageResponse": "response in Hindi/local language if applicable",
  "actionItems": ["specific action 1", "specific action 2"],
  "timeline": "expected completion time",
  "nextSteps": "what happens next",
  "contactInfo": "staff contact details if needed"
}
`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;
      let jsonText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      return {
        success: true,
        data: JSON.parse(jsonText)
      };

    } catch (error) {
      console.error('Response generation error:', error);
      return {
        success: false,
        data: {
          responseTemplate: `Thank you for reporting this ${complaint.department} issue. Our team has received your complaint and is working on it. Current status: ${currentStatus}.`,
          actionItems: ['Assess the issue', 'Take appropriate action'],
          timeline: '3-5 business days'
        }
      };
    }
  },

  /**
   * 3. SIMILAR COMPLAINTS DETECTOR
   * Finds patterns and suggests if complaints are related
   */
  detectSimilarComplaints: async (newComplaint, existingComplaints) => {
    const recentComplaints = existingComplaints.slice(0, 10).map(c => ({
      title: c.title,
      description: c.description,
      location: c.locality
    }));

    const prompt = `
Analyze if this new complaint is similar to existing complaints:

NEW COMPLAINT:
Title: ${newComplaint.title}
Description: ${newComplaint.description}

RECENT COMPLAINTS:
${JSON.stringify(recentComplaints, null, 2)}

Return ONLY this JSON:
{
  "isSimilar": true/false,
  "similarTo": ["complaint titles that are similar"],
  "pattern": "description of the pattern if found",
  "recommendation": "whether to combine or treat separately",
  "possibleCause": "potential underlying cause if pattern exists"
}
`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;
      let jsonText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      return {
        success: true,
        data: JSON.parse(jsonText)
      };

    } catch (error) {
      console.error('Similar complaints detection error:', error);
      return { success: false };
    }
  },

  /**
   * 4. ADMIN INSIGHTS GENERATOR
   * Provides strategic insights for administrators
   */
  generateAdminInsights: async (complaintsData) => {
    const summary = {
      totalComplaints: complaintsData.length,
      byDepartment: {},
      byPriority: {},
      recentTrends: []
    };

    complaintsData.forEach(c => {
      summary.byDepartment[c.department] = (summary.byDepartment[c.department] || 0) + 1;
      summary.byPriority[c.priority] = (summary.byPriority[c.priority] || 0) + 1;
    });

    const prompt = `
You are analyzing complaint data for a city's civic management system.

DATA SUMMARY:
${JSON.stringify(summary, null, 2)}

Provide strategic insights and recommendations:

Return ONLY this JSON:
{
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "trends": ["trend 1", "trend 2"],
  "criticalAreas": ["area needing immediate attention"],
  "recommendations": [
    {
      "area": "department or issue type",
      "recommendation": "specific actionable recommendation",
      "priority": "High/Medium/Low",
      "expectedImpact": "potential impact"
    }
  ],
  "resourceAllocation": "suggestions for resource distribution",
  "performanceMetrics": "key metrics to track"
}
`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;
      let jsonText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      return {
        success: true,
        data: JSON.parse(jsonText)
      };

    } catch (error) {
      console.error('Admin insights error:', error);
      return { success: false };
    }
  },

  /**
   * 5. QUALITY SCORE EVALUATOR
   * Evaluates complaint quality and suggests improvements
   */
  evaluateComplaintQuality: async (title, description) => {
    const prompt = `
Evaluate the quality of this complaint submission:

Title: ${title}
Description: ${description}

Provide feedback on:
1. Clarity of issue description
2. Sufficient detail provided
3. Missing information needed for resolution

Return ONLY this JSON:
{
  "qualityScore": 0-100,
  "clarity": "High/Medium/Low",
  "completeness": "High/Medium/Low",
  "missingInfo": ["what additional info would help"],
  "suggestions": ["how to improve the complaint description"]
}
`;

    try {
      const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      const text = data.candidates[0]?.content?.parts[0]?.text;
      let jsonText = text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      return {
        success: true,
        data: JSON.parse(jsonText)
      };

    } catch (error) {
      return { success: false };
    }
  }
};

/**
 * FALLBACK ANALYSIS (when AI fails)
 * Uses keyword-based classification
 */
function fallbackAnalysis(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  
  let department = 'Road';
  if (text.includes('water') || text.includes('pipe') || text.includes('drainage')) {
    department = 'Water';
  } else if (text.includes('electricity') || text.includes('power') || text.includes('light')) {
    department = 'Electricity';
  } else if (text.includes('garbage') || text.includes('waste') || text.includes('clean')) {
    department = 'Sanitation';
  }

  let priority = 'Medium';
  if (text.includes('urgent') || text.includes('emergency') || text.includes('danger')) {
    priority = 'High';
  } else if (text.includes('minor') || text.includes('small')) {
    priority = 'Low';
  }

  return {
    department,
    priority,
    urgency: priority === 'High' ? 'High' : 'Medium',
    category: 'General Issue',
    summary: description.substring(0, 150),
    detailedAnalysis: 'AI analysis unavailable. Using keyword-based classification.',
    suggestedAction: `Inspect the ${department.toLowerCase()} issue and take appropriate action`,
    estimatedResolutionTime: priority === 'High' ? '1-2 days' : '3-5 days',
    requiredResources: ['Staff inspection', 'Standard equipment'],
    affectedPopulation: 'To be assessed',
    riskLevel: priority,
    preventiveMeasures: 'Regular maintenance recommended',
    keywords: [department.toLowerCase(), 'complaint']
  };
}

export default enhancedGeminiService;