const { GoogleGenerativeAI } = require('@google/generative-ai');
const translationService = require('./translationService');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

class ResponseService {
  constructor() {
    this.model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  }

  // Generate acknowledgment response
  async generateAcknowledgment(complaint, language = 'en') {
    try {
      const prompt = `Generate a professional acknowledgment message for a citizen who submitted a complaint.

Complaint Details:
- Title: ${complaint.title}
- Department: ${complaint.department}
- Priority: ${complaint.priority}
- Complaint ID: ${complaint._id}

Create a response that:
1. Thanks the citizen
2. Mentions complaint ID
3. Provides estimated resolution time
4. Is professional and reassuring
5. Is 3-4 sentences

Write in a warm, official government tone.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let message = response.text().trim();
      
      // Translate if needed
      if (language !== 'en') {
        message = await translationService.translateText(message, language);
      }
      
      return message;
      
    } catch (error) {
      console.error('Acknowledgment Generation Error:', error);
      return `Thank you for submitting your complaint. Your complaint ID is ${complaint._id}. We will address this issue soon.`;
    }
  }

  // Generate status update response
  async generateStatusUpdateResponse(complaint, newStatus, language = 'en') {
    try {
      const statusMessages = {
        'In Progress': 'work has begun',
        'Resolved': 'has been successfully resolved'
      };

      const prompt = `Generate a professional status update message for a citizen.

Complaint Details:
- Title: ${complaint.title}
- Department: ${complaint.department}
- New Status: ${newStatus}
- Complaint ID: ${complaint._id}

Create a message that:
1. Informs about status change
2. ${statusMessages[newStatus] || 'provides update'}
3. Thanks for patience
4. Is 2-3 sentences

Write in a professional, reassuring tone.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let message = response.text().trim();
      
      // Translate if needed
      if (language !== 'en') {
        message = await translationService.translateText(message, language);
      }
      
      return message;
      
    } catch (error) {
      console.error('Status Update Generation Error:', error);
      return `Your complaint (ID: ${complaint._id}) status has been updated to ${newStatus}.`;
    }
  }

  // Generate resolution message
  async generateResolutionMessage(complaint, resolutionDetails, language = 'en') {
    try {
      const prompt = `Generate a professional resolution message for a citizen whose complaint has been resolved.

Complaint Details:
- Title: ${complaint.title}
- Department: ${complaint.department}
- Resolution Time: ${complaint.resolutionTime} hours
- Complaint ID: ${complaint._id}

Create a message that:
1. Confirms resolution
2. Summarizes what was done
3. Asks for feedback
4. Thanks for using the service
5. Is 3-4 sentences

Write in a warm, appreciative tone.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let message = response.text().trim();
      
      // Translate if needed
      if (language !== 'en') {
        message = await translationService.translateText(message, language);
      }
      
      return message;
      
    } catch (error) {
      console.error('Resolution Message Generation Error:', error);
      return `Your complaint (ID: ${complaint._id}) has been resolved. Thank you for your patience.`;
    }
  }

  // Generate delay notification
  async generateDelayNotification(complaint, reason, language = 'en') {
    try {
      const prompt = `Generate a professional delay notification message.

Complaint Details:
- Title: ${complaint.title}
- Department: ${complaint.department}
- Days Pending: ${Math.floor((Date.now() - new Date(complaint.createdAt)) / (1000 * 60 * 60 * 24))}
- Reason: ${reason || 'High workload'}

Create a message that:
1. Apologizes for delay
2. Explains reason
3. Provides new timeline
4. Assures action
5. Is 3 sentences

Write in an apologetic, professional tone.`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      let message = response.text().trim();
      
      // Translate if needed
      if (language !== 'en') {
        message = await translationService.translateText(message, language);
      }
      
      return message;
      
    } catch (error) {
      console.error('Delay Notification Generation Error:', error);
      return `We apologize for the delay in resolving your complaint (ID: ${complaint._id}). We are working on it and will resolve it soon.`;
    }
  }
}

module.exports = new ResponseService();