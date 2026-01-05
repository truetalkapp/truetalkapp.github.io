/**
 * TrueTalk Backend Server
 * Express API server for AI features
 * 
 * Run with: node server.js
 * Access at: http://localhost:3000
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');

// Import AI modules
const {
  TrueTalkChatbot,
  findMatches,
  search,
  getSuggestions,
  getStats,
  getCostBreakdown,
  isFeatureEnabled,
  config
} = require('./ai/index');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.')); // Serve static files (HTML, CSS, JS)

// Rate limiting (prevent abuse)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Max 100 requests per window per IP
  message: 'Too many requests, please try again later.'
});
app.use('/api/', limiter);

// Initialize AI instances
const chatbot = new TrueTalkChatbot();

// ==========================================
// API ENDPOINTS
// ==========================================

/**
 * POST /api/chat
 * AI Chatbot endpoint
 * 
 * Body:
 * {
 *   "message": "How do I find a mentor?",
 *   "userId": "user_123",
 *   "language": "en" or "bn",
 *   "history": [previous messages]
 * }
 */
app.post('/api/chat', async (req, res) => {
  try {
    const { message, userId, language = 'en', history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Build conversation history
    const messages = [
      ...history,
      { role: 'user', content: message }
    ];

    // Get chatbot response
    const response = await chatbot.chat(messages, {
      userId: userId || 'anonymous',
      language,
      currentPage: req.body.currentPage
    });

    res.json({
      success: true,
      message: response.message,
      cached: response.cached,
      cost: response.cost,
      latency: response.latency
    });
  } catch (error) {
    console.error('[API] Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      message: 'Sorry, I\'m having trouble right now. Please try again.'
    });
  }
});

/**
 * POST /api/search
 * Semantic search for mentors
 * 
 * Body:
 * {
 *   "query": "career mentor for software engineer",
 *   "topK": 10,
 *   "filters": { "zone": "Career", "maxBudget": 200 },
 *   "userId": "user_123"
 * }
 */
app.post('/api/search', async (req, res) => {
  try {
    const { query, topK = 10, filters = {}, userId } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const results = await search(query, {
      topK,
      filters,
      userId
    });

    res.json({
      success: true,
      results: results.results || [],
      parsedQuery: results.parsedQuery,
      cached: results.cached,
      count: results.results?.length || 0
    });
  } catch (error) {
    console.error('[API] Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search mentors',
      results: []
    });
  }
});

/**
 * GET /api/suggestions
 * Autocomplete suggestions for search
 * 
 * Query params:
 * ?q=career men&limit=5
 */
app.get('/api/suggestions', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }

    const suggestions = await getSuggestions(q, parseInt(limit));

    res.json({
      success: true,
      suggestions
    });
  } catch (error) {
    console.error('[API] Suggestions error:', error);
    res.json({ success: false, suggestions: [] });
  }
});

/**
 * POST /api/match
 * Find matching mentors for a mentee
 * 
 * Body:
 * {
 *   "userId": "user_123",
 *   "goal": "I want to transition to product management",
 *   "zone": "Career",
 *   "experienceLevel": "Mid-level",
 *   "budget": 200
 * }
 */
app.post('/api/match', async (req, res) => {
  try {
    const {
      userId,
      goal,
      zone,
      experienceLevel,
      currentRole,
      specificNeeds,
      preferredLanguage = 'en',
      budget
    } = req.body;

    if (!goal) {
      return res.status(400).json({ error: 'Goal is required' });
    }

    const matches = await findMatches({
      goal,
      zone,
      experienceLevel,
      currentRole,
      specificNeeds,
      preferredLanguage,
      budget
    }, {
      topK: 10,
      includeExplanation: true
    });

    res.json({
      success: true,
      matches,
      count: matches.length
    });
  } catch (error) {
    console.error('[API] Match error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find matches',
      matches: []
    });
  }
});

/**
 * GET /api/stats
 * Get AI cost and usage statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    const breakdown = await getCostBreakdown();

    res.json({
      success: true,
      stats,
      breakdown,
      features: {
        chatbot: isFeatureEnabled('chatbot'),
        matching: isFeatureEnabled('matching'),
        transcription: isFeatureEnabled('transcription'),
        translation: isFeatureEnabled('translation')
      }
    });
  } catch (error) {
    console.error('[API] Stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get statistics'
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    features: {
      chatbot: isFeatureEnabled('chatbot'),
      matching: isFeatureEnabled('matching'),
      transcription: isFeatureEnabled('transcription'),
      translation: isFeatureEnabled('translation')
    }
  });
});

/**
 * POST /api/waitlist
 * Handle waitlist submissions (existing functionality)
 */
app.post('/api/waitlist', async (req, res) => {
  try {
    const { name, email, phone, zone } = req.body;

    // In production, save to database
    console.log('[Waitlist] New submission:', { name, email, phone, zone });

    // For now, just return success
    res.json({
      success: true,
      message: 'Thanks for joining the waitlist!'
    });
  } catch (error) {
    console.error('[API] Waitlist error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process waitlist submission'
    });
  }
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log('\n===========================================');
  console.log('🚀 TrueTalk Backend Server Started');
  console.log('===========================================');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`📊 Stats: http://localhost:${PORT}/api/stats`);
  console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
  console.log('\n📋 Available Endpoints:');
  console.log('   POST /api/chat          - AI Chatbot');
  console.log('   POST /api/search        - Semantic Search');
  console.log('   POST /api/match         - Mentor Matching');
  console.log('   GET  /api/suggestions   - Autocomplete');
  console.log('   GET  /api/stats         - Cost Statistics');
  console.log('   POST /api/waitlist      - Waitlist Signup');
  console.log('\n💡 Tip: Open http://localhost:3000 to view your site');
  console.log('===========================================\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;
