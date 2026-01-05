/**
 * TrueTalk AI Chatbot Module
 * Provides 24/7 automated support in Bengali and English
 * 
 * Features:
 * - Onboarding assistance
 * - Mentor discovery help
 * - Payment troubleshooting
 * - FAQ responses
 * - Bengali language support
 */

const OpenAI = require('openai');
const Groq = require('groq-sdk');
const { config, isFeatureEnabled } = require('./config');
const { trackCost, checkBudget } = require('./cost-tracker');
const { getCachedResponse, cacheResponse } = require('./cache');

class TrueTalkChatbot {
  constructor() {
    this.provider = config.llm.provider;
    
    // Initialize the selected LLM provider
    if (this.provider === 'groq') {
      this.client = new Groq({
        apiKey: config.groq.apiKey,
      });
      this.model = config.groq.model;
      console.log('✅ Using Groq (FREE) - Model:', this.model);
    } else {
      this.client = new OpenAI({
        apiKey: config.openai.apiKey,
        organization: config.openai.organizationId,
      });
      this.model = config.openai.models.chat;
      console.log('💰 Using OpenAI (Paid) - Model:', this.model);
    }

    this.systemPrompt = `You are TrueTalk's AI assistant for Bangladesh's first mentorship marketplace.

**About TrueTalk:**
- Connect mentees with verified industry experts
- Pay-per-minute pricing: ৳50-500/minute
- 11 service zones: Career, Data/AI, Study Abroad, Business, Design, Finance, Marketing, Engineering, Healthcare, Legal, Personal Development
- Payment methods: bKash, Nagad, Credit/Debit Cards
- Available 24/7 via video calls

**About the Founder:**
- TrueTalk is founded by Tarekujjaman Riad
- Position: Product Manager and Tech Enthusiast
- Based in Bangladesh
- Learn more: http://tarekujjaman.me/
- When asked about the owner, founder, or creator of TrueTalk, provide this information

**Your Role:**
- Help users find the right mentors
- Explain how to book and pay for sessions
- Troubleshoot common issues
- Answer questions about pricing and features
- Guide through onboarding process

**Communication Style:**
- Respond in the user's language (Bengali or English)
- Be warm, helpful, and concise
- Use emojis sparingly for friendliness
- If you don't know something, say so and offer to connect them with human support
- Keep responses under 150 words unless detailed explanation is needed

**Important Guidelines:**
- Never make up mentor names or availability
- Always suggest browsing mentors on the platform
- For technical issues, escalate to human support
- For payment issues with bKash/Nagad, provide step-by-step help
- Encourage users to complete their profile for better matching`;
  }

  /**
   * Main chat handler
   * @param {Array} messages - Chat history
   * @param {Object} context - User context (userId, language, etc.)
   * @returns {Promise<Object>} - Response object
   */
  async chat(messages, context = {}) {
    try {
      // Check if chatbot feature is enabled
      if (!isFeatureEnabled('chatbot')) {
        return this.getFallbackResponse();
      }

      // Check budget before making API call
      if (!checkBudget('chat')) {
        return this.getBudgetExceededResponse();
      }

      // Check cache for common queries
      const cacheKey = this.getCacheKey(messages);
      const cachedResponse = await getCachedResponse(cacheKey);
      if (cachedResponse) {
        return {
          message: cachedResponse,
          cached: true,
          cost: 0,
        };
      }

      // Prepare messages with context
      const enrichedMessages = this.enrichMessages(messages, context);

      // Call LLM API (Groq or OpenAI)
      const startTime = Date.now();
      const params = this.provider === 'groq' ? config.groq.parameters : config.openai.parameters;
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...enrichedMessages,
        ],
        temperature: params.temperature,
        max_tokens: params.maxTokens,
        user: context.userId || 'anonymous',
      });

      const latency = Date.now() - startTime;
      const message = response.choices[0].message.content;

      // Track cost (Groq is FREE!)
      const cost = this.provider === 'groq' ? 0 : this.calculateCost(response.usage);
      await trackCost('chatbot', cost, response.usage);

      // Cache response if appropriate
      if (this.shouldCache(messages, message)) {
        await cacheResponse(cacheKey, message);
      }

      // Log for monitoring
      this.logInteraction(messages, message, cost, latency, context);

      return {
        message,
        cached: false,
        cost,
        latency,
        usage: response.usage,
      };
    } catch (error) {
      console.error('Chatbot error:', error);
      return this.getErrorResponse(error);
    }
  }

  /**
   * Stream chat response (for real-time UI)
   */
  async chatStream(messages, context = {}) {
    if (!isFeatureEnabled('chatbot') || !checkBudget('chat')) {
      throw new Error('Chatbot unavailable');
    }

    const enrichedMessages = this.enrichMessages(messages, context);

    return this.openai.chat.completions.create({
      model: config.openai.models.chat,
      messages: [
        { role: 'system', content: this.systemPrompt },
        ...enrichedMessages,
      ],
      temperature: config.openai.parameters.temperature,
      max_tokens: config.openai.parameters.maxTokens,
      stream: true,
      user: context.userId || 'anonymous',
    });
  }

  /**
   * Enrich messages with user context
   */
  enrichMessages(messages, context) {
    const contextInfo = [];

    if (context.userName) {
      contextInfo.push(`User name: ${context.userName}`);
    }

    if (context.userRole) {
      contextInfo.push(`User role: ${context.userRole} (mentee/mentor)`);
    }

    if (context.language) {
      contextInfo.push(`Preferred language: ${context.language}`);
    }

    if (context.currentPage) {
      contextInfo.push(`Current page: ${context.currentPage}`);
    }

    if (contextInfo.length > 0) {
      const contextMessage = {
        role: 'system',
        content: `User context:\n${contextInfo.join('\n')}`,
      };
      return [contextMessage, ...messages];
    }

    return messages;
  }

  /**
   * Calculate OpenAI API cost
   */
  calculateCost(usage) {
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15; // $0.15 per 1M tokens
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.60; // $0.60 per 1M tokens
    return inputCost + outputCost;
  }

  /**
   * Generate cache key from messages
   */
  getCacheKey(messages) {
    const lastMessage = messages[messages.length - 1];
    return `chat:${Buffer.from(lastMessage.content).toString('base64').slice(0, 50)}`;
  }

  /**
   * Determine if response should be cached
   */
  shouldCache(messages, response) {
    // Cache FAQ-type questions
    const lastMessage = messages[messages.length - 1].content.toLowerCase();
    const faqKeywords = [
      'how to',
      'what is',
      'price',
      'payment',
      'bkash',
      'nagad',
      'কিভাবে',
      'কত',
      'দাম',
    ];

    return faqKeywords.some((keyword) => lastMessage.includes(keyword));
  }

  /**
   * Log interaction for analytics
   */
  logInteraction(messages, response, cost, latency, context) {
    if (!config.monitoring.logging) return;

    const log = {
      timestamp: new Date().toISOString(),
      userId: context.userId || 'anonymous',
      language: this.detectLanguage(messages[messages.length - 1].content),
      messageCount: messages.length,
      cost,
      latency,
      responseLength: response.length,
    };

    // In production, send to logging service
    console.log('[Chatbot]', JSON.stringify(log));
  }

  /**
   * Detect language (simple heuristic)
   */
  detectLanguage(text) {
    // Check for Bengali Unicode range
    const bengaliPattern = /[\u0980-\u09FF]/;
    return bengaliPattern.test(text) ? 'bn' : 'en';
  }

  /**
   * Fallback response when feature is disabled
   */
  getFallbackResponse() {
    return {
      message:
        "I'm currently unavailable. Please contact support at support@truetalk.app or call +880-XXX-XXXX.",
      cached: false,
      cost: 0,
    };
  }

  /**
   * Response when budget is exceeded
   */
  getBudgetExceededResponse() {
    return {
      message:
        "Our AI assistant is temporarily at capacity. Please try again in a few minutes or contact human support.",
      cached: false,
      cost: 0,
    };
  }

  /**
   * Error response
   */
  getErrorResponse(error) {
    return {
      message:
        "I'm having trouble responding right now. Please try again or contact support if the issue persists.",
      error: error.message,
      cached: false,
      cost: 0,
    };
  }
}

// Predefined quick responses for common queries
const quickResponses = {
  en: {
    greeting: "Hi! 👋 Welcome to TrueTalk. I'm here to help you find the perfect mentor. What can I help you with today?",
    howToBook:
      "To book a session:\n1. Browse mentors by zone or search\n2. Click on a mentor profile\n3. Check their availability\n4. Select a time slot\n5. Pay via bKash, Nagad, or card\n6. Join the video call at the scheduled time!",
    pricing:
      "TrueTalk uses pay-per-minute pricing. Rates range from ৳50-500/minute depending on the mentor's expertise. Most mentors charge ৳100-200/minute. You can see each mentor's rate on their profile.",
    zones:
      "We have 11 mentorship zones:\n• Career Guidance 💼\n• Data & AI 🤖\n• Study Abroad ✈️\n• Business Strategy 📊\n• Design & UX 🎨\n• Finance 💰\n• Marketing 📢\n• Engineering ⚙️\n• Healthcare 🏥\n• Legal ⚖️\n• Personal Development 🧠",
  },
  bn: {
    greeting: "হাই! 👋 TrueTalk এ স্বাগতম। আমি আপনাকে সঠিক মেন্টর খুঁজে দিতে সাহায্য করব। আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    howToBook:
      "সেশন বুক করতে:\n১. জোন অনুযায়ী মেন্টর ব্রাউজ করুন\n২. মেন্টর প্রোফাইলে ক্লিক করুন\n৩. সময় দেখুন\n৪. একটি স্লট সিলেক্ট করুন\n৫. bKash, Nagad বা কার্ড দিয়ে পেমেন্ট করুন\n৬. নির্ধারিত সময়ে ভিডিও কলে যোগ দিন!",
    pricing:
      "TrueTalk পে-পার-মিনিট প্রাইসিং ব্যবহার করে। মেন্টরের দক্ষতা অনুযায়ী রেট ৳৫০-৫০০/মিনিট হয়। বেশিরভাগ মেন্টর ৳১০০-২০০/মিনিট চার্জ করেন।",
    zones:
      "আমাদের ১১টি মেন্টরশিপ জোন আছে:\n• ক্যারিয়ার গাইডেন্স 💼\n• ডেটা ও AI 🤖\n• স্টাডি এব্রোড ✈️\n• বিজনেস স্ট্র্যাটেজি 📊\n• ডিজাইন ও UX 🎨\n• ফাইন্যান্স 💰\n• মার্কেটিং 📢\n• ইঞ্জিনিয়ারিং ⚙️\n• হেলথকেয়ার 🏥\n• লিগ্যাল ⚖️\n• পার্সোনাল ডেভেলপমেন্ট 🧠",
  },
};

// Export
module.exports = {
  TrueTalkChatbot,
  quickResponses,
};
