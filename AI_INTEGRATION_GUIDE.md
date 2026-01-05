# AI Integration Guide for TrueTalk

This guide explains how to integrate AI features into your TrueTalk website.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Current)                        │
│              index.html + script.js + style.css              │
│                  Running in Browser                          │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Requests
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (New - Node.js)                    │
│                    Express API Server                        │
│                   http://localhost:3000                      │
├─────────────────────────────────────────────────────────────┤
│  Routes:                                                     │
│  - POST /api/chat         → AI Chatbot                      │
│  - POST /api/search       → Semantic Search                 │
│  - POST /api/match        → Mentor Matching                 │
│  - GET  /api/suggestions  → Autocomplete                    │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    AI MODULES (ai/)                          │
│         OpenAI + Pinecone + Cost Tracking + Cache           │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Integration

### Step 1: Set Up Backend Server (5 minutes)

1. **Navigate to project root:**
```bash
cd "d:\Personal Projects\truetalkapp.github.io-main\New"
```

2. **Install backend dependencies:**
```bash
npm install express cors body-parser openai @pinecone-database/pinecone redis dotenv
```

3. **Configure API keys:**
```bash
# Copy the example file
cp .env.ai.example .env.ai

# Edit .env.ai and add your keys:
# - Get OpenAI key from: https://platform.openai.com/api-keys
# - Get Pinecone key from: https://app.pinecone.io/
```

4. **Start the backend server:**
```bash
node server.js
```

You should see:
```
[TrueTalk Server] Backend started on http://localhost:3000
[TrueTalk AI] Configuration validated successfully
```

### Step 2: Test AI Features (2 minutes)

Open another terminal and test the API:

```bash
# Test chatbot
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"How do I find a mentor?","userId":"test_user"}'

# Test search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"career mentor for software engineer"}'
```

### Step 3: Update Frontend (Already done!)

Your `index.html` now includes:
- AI-powered chatbot widget (bottom right)
- Smart search with autocomplete
- Mentor recommendation system

### Step 4: Open Your Website

1. **Start the backend:**
```bash
node server.js
```

2. **Open `index.html` in your browser:**
   - Either double-click the file
   - Or use Live Server extension in VS Code

3. **Try the AI features:**
   - Click the chat icon (bottom right) → Ask questions
   - Use the search bar → Type "career mentor"
   - Browse mentors → See AI-powered recommendations

## Integration Details

### 1. AI Chatbot Widget

**Where:** Bottom right corner of every page

**How it works:**
```javascript
// User types message
const userMessage = "How do I book a session?";

// Frontend sends to backend
fetch('http://localhost:3000/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: userMessage,
    userId: getCurrentUserId(),
    language: 'en' // or 'bn' for Bengali
  })
})
.then(response => response.json())
.then(data => {
  // Display bot response
  displayMessage(data.message, 'bot');
});
```

**Features:**
- 24/7 automated support
- Bengali language support (type in Bengali, bot responds in Bengali)
- Answers about pricing, booking, zones, etc.
- Costs ~$0.05 per conversation

### 2. Semantic Search

**Where:** Search bar on homepage and mentor discovery page

**How it works:**
```javascript
// User searches with natural language
const searchQuery = "someone who can help me get into Stanford";

// Frontend sends to backend
fetch('http://localhost:3000/api/search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: searchQuery,
    topK: 10,
    filters: { zone: 'Study Abroad' }
  })
})
.then(response => response.json())
.then(data => {
  // Display search results
  displayMentors(data.results);
});
```

**Features:**
- Understands intent (not just keywords)
- Works with Bengali queries
- Auto-suggests completions
- Costs ~$0.02 per search

### 3. Mentor Matching

**Where:** After user creates profile or selects a zone

**How it works:**
```javascript
// Get personalized mentor recommendations
fetch('http://localhost:3000/api/match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: getCurrentUserId(),
    goal: "I want to transition to product management",
    zone: "Career",
    experienceLevel: "Mid-level",
    budget: 200 // BDT per minute
  })
})
.then(response => response.json())
.then(data => {
  // Display top matches with explanations
  data.matches.forEach(match => {
    console.log(`${match.mentor.name}: ${match.explanation}`);
  });
});
```

**Features:**
- AI-powered matching based on goals
- Personalized explanations
- Multi-factor ranking (rating, availability, fit)
- Costs ~$0.03 per match request

## Cost Management

### Current Limits (set in .env.ai)
- Daily budget: $50
- Monthly budget: $1,500
- Auto-throttling when 80% reached

### Cost Tracking Dashboard

Access at `http://localhost:3000/api/stats`:

```json
{
  "today": 2.45,
  "month": 24.80,
  "dailyBudget": 50,
  "dailyRemaining": 47.55,
  "utilizationDaily": 4.9
}
```

### Cost Optimization Tips

1. **Enable caching** (already enabled):
   - Common queries cached for 1 hour
   - 60-70% cost reduction

2. **Use appropriate models**:
   - GPT-4o-mini for most tasks (16x cheaper than GPT-4o)
   - Reserve GPT-4o for complex tasks only

3. **Set user rate limits**:
   - Max 50 AI requests per user per hour
   - Prevents abuse

## Testing in Development

### Mock Mode (No API keys needed)

Set in `.env.ai`:
```env
AI_DEV_MODE=true
AI_MOCK_RESPONSES=true
```

The system will return mock responses without calling APIs.

### Test with Small Budget

Start with:
```env
AI_DAILY_BUDGET_USD=5
AI_MONTHLY_BUDGET_USD=50
```

Increase as needed.

## Production Deployment

### Option 1: Deploy to Vercel (Recommended)

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel deploy
```

Your backend will be at: `https://truetalk-api.vercel.app`

Update frontend API URL:
```javascript
const API_URL = 'https://truetalk-api.vercel.app';
```

### Option 2: Deploy to Heroku

```bash
# Install Heroku CLI
heroku create truetalk-api

# Add environment variables
heroku config:set OPENAI_API_KEY=your-key
heroku config:set PINECONE_API_KEY=your-key

# Deploy
git push heroku main
```

### Option 3: Deploy to Your Own Server

1. Upload backend files to server
2. Install Node.js on server
3. Run: `pm2 start server.js`
4. Configure nginx reverse proxy

## Security Considerations

### API Key Protection

**❌ NEVER do this:**
```javascript
// DON'T put API keys in frontend
const openai = new OpenAI({ apiKey: 'sk-proj-xxx' });
```

**✅ Always do this:**
```javascript
// Frontend makes request to YOUR backend
fetch('http://localhost:3000/api/chat', { ... });

// Backend (server.js) has the API keys
// Keys are in .env.ai (not committed to git)
```

### Rate Limiting

Already implemented in `server.js`:
- 100 requests per 15 minutes per IP
- Prevents abuse and controls costs

### CORS Configuration

Update in `server.js` for production:
```javascript
const cors = require('cors');
app.use(cors({
  origin: 'https://truetalk.app', // Your domain
  credentials: true
}));
```

## Troubleshooting

### "Cannot connect to backend"

**Problem:** Frontend can't reach backend

**Solution:**
1. Make sure backend is running: `node server.js`
2. Check console for errors
3. Verify URL in frontend matches backend port

### "OPENAI_API_KEY is required"

**Problem:** API key not configured

**Solution:**
1. Copy `.env.ai.example` to `.env.ai`
2. Add your OpenAI API key
3. Restart backend: `Ctrl+C` then `node server.js`

### "Budget exceeded"

**Problem:** Daily spending limit reached

**Solution:**
1. Check costs: `curl http://localhost:3000/api/stats`
2. Increase budget in `.env.ai`
3. Or wait until midnight UTC for reset

### "Chatbot not responding"

**Problem:** Feature might be disabled

**Solution:**
1. Check `.env.ai`: `AI_CHATBOT_ENABLED=true`
2. Check browser console for errors (F12)
3. Verify backend logs

## Next Steps

### 1. Add More AI Features (Optional)

Already implemented, just enable in `.env.ai`:
```env
AI_TRANSCRIPTION_ENABLED=true
AI_TRANSLATION_ENABLED=true
AI_SENTIMENT_ANALYSIS_ENABLED=true
```

### 2. Customize Chatbot Personality

Edit `ai/chatbot.js`:
```javascript
this.systemPrompt = `You are TrueTalk's friendly AI assistant...
[Add your custom instructions here]`;
```

### 3. Add More Search Filters

Edit `server.js` → `/api/search` endpoint:
```javascript
const filters = {
  zone: req.body.zone,
  minRating: req.body.minRating,
  maxPrice: req.body.maxPrice,
  language: req.body.language,
  availability: req.body.availability
};
```

### 4. Track Analytics

Add to your analytics platform:
```javascript
// When user uses AI feature
gtag('event', 'ai_interaction', {
  'feature': 'chatbot',
  'user_id': userId,
  'query': userMessage
});
```

## Support

### Need Help?

1. **Check logs:**
   - Backend logs: Terminal running `server.js`
   - Frontend logs: Browser console (F12)

2. **Cost concerns:**
   - View dashboard: `http://localhost:3000/api/stats`
   - Adjust limits in `.env.ai`

3. **Feature requests:**
   - See `ai/README.md` for all available features
   - Most features are already implemented, just need enabling

## Summary

✅ **What you have now:**
- AI chatbot (Bengali + English)
- Semantic search
- Mentor matching
- Cost tracking & budgets
- Caching for cost savings

✅ **What you need to do:**
1. Get OpenAI API key ($5 free credit)
2. Get Pinecone API key (free tier available)
3. Configure `.env.ai`
4. Run `node server.js`
5. Open `index.html` in browser
6. Test the chatbot!

✅ **Monthly costs:**
- Launch phase (1K users): $300-500
- Growth phase (10K users): $800-1,500

That's it! Your TrueTalk platform now has cutting-edge AI capabilities. 🚀
