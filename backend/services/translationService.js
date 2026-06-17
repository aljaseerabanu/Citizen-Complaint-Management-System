const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class TranslationService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    // Supported languages
    this.supportedLanguages = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'pa': 'Punjabi'
    };
  }

  // Translate text to target language
  async translateText(text, targetLanguage = 'en') {
    try {
      if (targetLanguage === 'en') return text;

      const languageName = this.supportedLanguages[targetLanguage];
      
      const prompt = `Translate the following text to ${languageName}. 
Return ONLY the translated text, nothing else.

Text to translate: "${text}"`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim();
      
    } catch (error) {
      console.error('Translation Error:', error);
      return text; // Return original if translation fails
    }
  }

  // Detect language of text
  async detectLanguage(text) {
    try {
      const prompt = `Detect the language of this text and respond with ONLY the language code (en, hi, ta, te, bn, mr, gu, kn, ml, pa).

Text: "${text}"

Respond with just the 2-letter code, nothing else.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const detectedCode = response.text().trim().toLowerCase();
      
      return this.supportedLanguages[detectedCode] ? detectedCode : 'en';
      
    } catch (error) {
      console.error('Language Detection Error:', error);
      return 'en';
    }
  }

  // Translate complaint data
  async translateComplaint(complaint, targetLanguage) {
    try {
      const translated = {
        title: await this.translateText(complaint.title, targetLanguage),
        description: await this.translateText(complaint.description, targetLanguage),
        aiSummary: complaint.aiSummary ? 
          await this.translateText(complaint.aiSummary, targetLanguage) : null
      };
      
      return translated;
    } catch (error) {
      console.error('Complaint Translation Error:', error);
      return complaint;
    }
  }
}

module.exports = new TranslationService();