import { GoogleGenerativeAI } from '@google/generative-ai';
import { Translate } from '@google-cloud/translate/build/src/v2/index.js';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Initialize Google Translate
const translate = new Translate({
  key: process.env.GOOGLE_TRANSLATE_API_KEY
});

// Supported languages
const SUPPORTED_LANGUAGES = {
  'en': 'English',
  'hi': 'Hindi',
  'bn': 'Bengali',
  'te': 'Telugu',
  'mr': 'Marathi',
  'ta': 'Tamil',
  'gu': 'Gujarati',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'pa': 'Punjabi'
};

// @desc    Analyze complaint with Gemini AI
// @route   POST /api/ai/analyze
// @access  Private
export const analyzeComplaint = async (req, res) => {
  try {
    const { title, description, department } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Check if API key exists
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not found. Returning mock analysis.');
      return res.status(200).json({
        success: true,
        analysis: getMockAnalysis(title, description, department)
      });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `
You are an AI assistant analyzing citizen complaints for a government complaint management system.

Analyze the following complaint and provide a structured response:

Title: ${title}
Description: ${description}
Department: ${department || 'Not specified'}

Provide analysis in the following JSON format (respond ONLY with valid JSON, no other text):
{
  "summary": "Brief 2-3 sentence summary of the complaint",
  "category": "Specific category (e.g., 'Road Damage', 'Water Supply', 'Power Outage', 'Waste Management')",
  "suggestedAction": "Recommended action for staff to resolve this",
  "estimatedResolutionTime": "Estimated time like '2-3 days', '1 week', '24 hours'",
  "severityScore": 7,
  "urgencyLevel": "high",
  "sentiment": "frustrated",
  "isRelevant": true,
  "keywords": ["keyword1", "keyword2", "keyword3"]
}

Severity Score: 1-10 (1=minor, 10=critical)
Urgency Level: low, medium, high, critical
Sentiment: polite, neutral, frustrated, angry
isRelevant: true if it's a genuine complaint, false if spam/irrelevant
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Parse JSON response
    let analysis;
    try {
      // Remove markdown code blocks if present
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', text);
      analysis = getMockAnalysis(title, description, department);
    }

    res.status(200).json({
      success: true,
      analysis
    });

  } catch (error) {
    console.error('AI Analysis Error:', error);
    
    // Return mock analysis as fallback
    res.status(200).json({
      success: true,
      analysis: getMockAnalysis(req.body.title, req.body.description, req.body.department),
      warning: 'Using fallback analysis due to AI service error'
    });
  }
};

// @desc    Translate text
// @route   POST /api/ai/translate
// @access  Private
export const translateText = async (req, res) => {
  try {
    const { text, targetLanguage, sourceLanguage } = req.body;

    if (!text || !targetLanguage) {
      return res.status(400).json({
        success: false,
        message: 'Text and target language are required'
      });
    }

    if (!SUPPORTED_LANGUAGES[targetLanguage]) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported target language'
      });
    }

    // Check if API key exists
    if (!process.env.GOOGLE_TRANSLATE_API_KEY) {
      console.warn('⚠️ GOOGLE_TRANSLATE_API_KEY not found. Returning original text.');
      return res.status(200).json({
        success: true,
        translatedText: text,
        warning: 'Translation service unavailable'
      });
    }

    const [translation] = await translate.translate(text, {
      from: sourceLanguage || 'auto',
      to: targetLanguage
    });

    res.status(200).json({
      success: true,
      translatedText: translation,
      originalText: text,
      sourceLanguage: sourceLanguage || 'auto-detected',
      targetLanguage
    });

  } catch (error) {
    console.error('Translation Error:', error);
    res.status(500).json({
      success: false,
      message: 'Translation failed',
      translatedText: req.body.text // Return original text as fallback
    });
  }
};

// @desc    Generate auto-response
// @route   POST /api/ai/generate-response
// @access  Private (Staff, Admin)
export const generateAutoResponse = async (req, res) => {
  try {
    const { complaintTitle, status, language = 'en' } = req.body;

    if (!complaintTitle || !status) {
      return res.status(400).json({
        success: false,
        message: 'Complaint title and status are required'
      });
    }

    const responses = {
      'Pending': `Thank you for submitting your complaint regarding "${complaintTitle}". We have received it and our team will review it shortly. You will be notified once action is taken.`,
      'In Progress': `Your complaint about "${complaintTitle}" is now being addressed. Our staff is working on resolving this issue. We appreciate your patience.`,
      'Resolved': `Your complaint regarding "${complaintTitle}" has been successfully resolved. Thank you for bringing this to our attention. If you have any further concerns, please let us know.`,
      'Rejected': `We have reviewed your complaint about "${complaintTitle}". Unfortunately, we cannot process this request at this time. Please contact us for more details.`
    };

    let message = responses[status] || responses['Pending'];

    // Translate if needed
    if (language !== 'en' && process.env.GOOGLE_TRANSLATE_API_KEY) {
      try {
        const [translation] = await translate.translate(message, language);
        message = translation;
      } catch (translateError) {
        console.error('Translation failed, using English:', translateError);
      }
    }

    res.status(200).json({
      success: true,
      response: {
        message,
        type: status.toLowerCase().replace(' ', '_'),
        language
      }
    });

  } catch (error) {
    console.error('Generate Response Error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate response'
    });
  }
};

// @desc    Detect spam/irrelevant complaints
// @route   POST /api/ai/detect-spam
// @access  Private
export const detectSpam = async (req, res) => {
  try {
    const { title, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: 'Title and description are required'
      });
    }

    // Simple spam detection rules (can be enhanced with AI)
    const spamKeywords = ['test', 'testing', 'asdf', 'qwerty', 'xyz', 'abc'];
    const titleLower = title.toLowerCase();
    const descLower = description.toLowerCase();

    const isSpam = spamKeywords.some(keyword => 
      titleLower.includes(keyword) || descLower.includes(keyword)
    ) || title.length < 5 || description.length < 10;

    res.status(200).json({
      success: true,
      isSpam,
      isRelevant: !isSpam,
      confidence: isSpam ? 0.8 : 0.9
    });

  } catch (error) {
    console.error('Spam Detection Error:', error);
    res.status(500).json({
      success: false,
      message: 'Spam detection failed',
      isRelevant: true // Default to relevant to avoid false positives
    });
  }
};

// Helper function to generate mock analysis
function getMockAnalysis(title, description, department) {
  const severityMap = {
    'Road': 7,
    'Water': 8,
    'Electricity': 9,
    'Sanitation': 6
  };

  return {
    summary: `Complaint about ${title.toLowerCase()}. ${description.substring(0, 100)}...`,
    category: department || 'General',
    suggestedAction: 'Investigate the reported issue and dispatch appropriate personnel for assessment',
    estimatedResolutionTime: '2-3 days',
    severityScore: severityMap[department] || 7,
    urgencyLevel: 'high',
    sentiment: 'frustrated',
    isRelevant: true,
    keywords: title.split(' ').slice(0, 3)
  };
}

export default {
  analyzeComplaint,
  translateText,
  generateAutoResponse,
  detectSpam
};