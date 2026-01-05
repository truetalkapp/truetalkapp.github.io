# TrueTalk AI Modules

Comprehensive AI implementation for TrueTalk mentorship platform.

## 📁 Directory Structure

```
ai/
├── config.js              # Central AI configuration
├── cache.js               # Response caching system
├── cost-tracker.js        # API cost monitoring
├── chatbot.js            # Conversational AI chatbot
├── matching.js           # AI mentor-mentee matching
├── session-intelligence.js  # Transcription & summarization
├── semantic-search.js    # Natural language search
├── package.json          # Dependencies
└── README.md            # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd ai
npm install
```

### 2. Configure Environment

```bash
cp ../.env.ai.example ../.env.ai
```

Edit `.env.ai` and add your API keys:

```env
OPENAI_API_KEY=sk-proj-your-key-here
PINECONE_API_KEY=your-pinecone-key
GOOGLE_CLOUD_API_KEY=your-google-key
```

### 3. Test Chatbot

```javascript
const { TrueTalkChatbot } = require('./chatbot');

const chatbot = new TrueTalkChatbot();

const response = await chatbot.chat([
  { role: 'user', content: 'How do I find a career mentor?' }
], {
  userId: 'user_123',
  language: 'en'
});

console.log(response.message);
```

### 4. Test Matching

```javascript
const { findMatches } = require('./matching');

const matches = await findMatches({
  goal: 'I want to transition to product management',
  zone: 'Career',
  experienceLevel: 'Mid-level',
  preferredLanguage: 'en',
  budget: 200 // BDT per minute
}, {
  topK: 5,
  includeExplanation: true
});

console.log(matches);
```

## 🧩 Module Overview

### 1. Configuration (`config.js`)

Central configuration for all AI services.

**Key Functions:**
- `validateConfig()` - Validates API keys and settings
- `isFeatureEnabled(feature)` - Check if AI feature is enabled
- `getCostLimits()` - Get budget limits

### 2. Chatbot (`chatbot.js`)

24/7 conversational AI assistant supporting Bengali and English.

**Features:**
- Multi-turn conversations
- Bengali language support
- Context-aware responses
- Cost tracking
- Response caching

**Example:**
```javascript
const { TrueTalkChatbot } = require('./chatbot');
const bot = new TrueTalkChatbot();

const response = await bot.chat([
  { role: 'user', content: 'আমি কিভাবে মেন্টর খুঁজবো?' }
], {
  userId: 'user_456',
  language: 'bn'
});
```

### 3. Matching Engine (`matching.js`)

AI-powered mentor-mentee matching using semantic similarity.

**Algorithm:**
1. Generate embeddings for mentee profile
2. Vector similarity search in Pinecone
3. Multi-factor re-ranking
4. Personalization based on history

**Scoring Factors:**
- Semantic match: 40%
- Rating: 30%
- Response rate: 15%
- Availability: 10%
- Completion rate: 5%

**Example:**
```javascript
const { findMatches, indexMentor } = require('./matching');

// Index a new mentor
await indexMentor({
  id: 'mentor_789',
  fullName: 'Sarah Ahmed',
  headline: 'Senior Product Manager at Tech Corp',
  bio: 'Helping professionals transition to PM roles...',
  zones: ['Career', 'Business'],
  ratePerMinute: 150,
  // ... other fields
});

// Find matches
const matches = await findMatches({
  goal: 'Become a product manager',
  zone: 'Career',
  experienceLevel: 'Entry'
});
```

### 4. Cost Tracker (`cost-tracker.js`)

Real-time monitoring of AI API spending.

**Features:**
- Daily/monthly budget tracking
- Automatic alerts at 80% threshold
- Per-service cost breakdown
- Redis-based for distributed systems

**Example:**
```javascript
const { getStats, getCostBreakdown } = require('./cost-tracker');

// Get current spending
const stats = await getStats();
console.log(`Today: $${stats.today.toFixed(2)}/${stats.dailyBudget}`);
console.log(`Utilization: ${stats.utilizationDaily.toFixed(1)}%`);

// Get breakdown by service
const breakdown = await getCostBreakdown();
console.log(breakdown);
// {
//   chatbot: { count: 245, totalCost: 12.50, avgCost: 0.051 },
//   matching: { count: 89, totalCost: 5.20, avgCost: 0.058 }
// }
```

### 5. Cache (`cache.js`)

Response caching to reduce API costs.

**Features:**
- Redis or in-memory storage
- Configurable TTL (default: 1 hour)
- Automatic expiration
- Cache hit tracking

**Example:**
```javascript
const { getCachedResponse, cacheResponse } = require('./cache');

const cacheKey = 'faq:how-to-book';
let response = await getCachedResponse(cacheKey);

if (!response) {
  response = await chatbot.chat([...]);
  await cacheResponse(cacheKey, response);
}
```

## 💰 Cost Estimation

### At 10,000 users, 5,000 sessions/month

| Service | Usage | Cost |
|---------|-------|------|
| GPT-4o-mini (chatbot) | 50M tokens | $150 |
| Whisper (transcription) | 2,500 hours | $900 |
| Embeddings | 10M tokens | $20 |
| Pinecone | Standard plan | $70 |
| **Total** | | **$1,140/month** |

### Cost Optimization Tips

1. **Enable caching** - 60-70% cost reduction for common queries
2. **Use GPT-4o-mini** - 16x cheaper than GPT-4o
3. **Batch operations** - Process transcriptions in batches
4. **Set budget limits** - Automatic throttling when limit reached
5. **Cache embeddings** - Recompute only when profiles change

## 🔒 Security Best Practices

1. **Never commit `.env.ai`** to version control
2. **Use environment variables** for all API keys
3. **Implement rate limiting** per user
4. **Monitor for anomalous usage** patterns
5. **Rotate API keys** quarterly
6. **Use separate keys** for dev/staging/prod

## 📊 Monitoring

### Cost Dashboard

```javascript
const { getStats } = require('./cost-tracker');

setInterval(async () => {
  const stats = await getStats();
  console.log(`
Daily: $${stats.today.toFixed(2)} / $${stats.dailyBudget}
Monthly: $${stats.month.toFixed(2)} / $${stats.monthlyBudget}
Remaining: $${stats.dailyRemaining.toFixed(2)} today
  `);
}, 60000); // Every minute
```

### Cache Statistics

```javascript
const { getCacheStats } = require('./cache');

const stats = await getCacheStats();
console.log(`Cache entries: ${stats.entries}`);
console.log(`Storage: ${stats.storage}`);
```

## 🐛 Troubleshooting

### "OPENAI_API_KEY is required"
- Copy `.env.ai.example` to `.env.ai`
- Add your OpenAI API key
- Restart the application

### "Pinecone index not found"
- Create index in Pinecone dashboard
- Name: `truetalk-mentors`
- Dimension: 1536
- Metric: Cosine

### "Budget exceeded"
- Check current spending: `getStats()`
- Increase budget in `.env.ai`
- Or wait until daily reset (midnight UTC)

### High costs
- Enable caching: `AI_CACHE_ENABLED=true`
- Review `getCostBreakdown()` to identify expensive services
- Consider reducing `AI_CHAT_MAX_TOKENS`

## 📚 API Reference

See individual module files for detailed API documentation:
- [config.js](./config.js) - Configuration management
- [chatbot.js](./chatbot.js) - Conversational AI
- [matching.js](./matching.js) - Mentor matching
- [cost-tracker.js](./cost-tracker.js) - Cost monitoring
- [cache.js](./cache.js) - Response caching

## 🚧 Roadmap

- [ ] Session intelligence (transcription + summarization)
- [ ] Semantic search implementation
- [ ] Quality & trust AI (fraud detection)
- [ ] Personalization engine
- [ ] Dynamic pricing intelligence
- [ ] Analytics & predictions
- [ ] Voice/video AI features

## 📄 License

MIT License - See LICENSE file for details

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Submit pull request

## 💬 Support

- Email: dev@truetalk.app
- Slack: #ai-development
- Documentation: https://docs.truetalk.app/ai
