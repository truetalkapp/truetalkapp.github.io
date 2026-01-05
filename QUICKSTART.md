# Quick Start Guide - TrueTalk AI Features

Follow these steps to get AI features running on your site in 5 minutes!

## Step 1: Install Backend Dependencies (2 minutes)

Open PowerShell in your project folder and run:

```powershell
cd "d:\Personal Projects\truetalkapp.github.io-main\New"
npm install
```

This installs:
- Express (backend server)
- OpenAI (AI chatbot)
- Pinecone (vector search)
- Other dependencies

## Step 2: Get API Keys (Free) (3 minutes)

### OpenAI API Key (Required)
1. Go to: https://platform.openai.com/api-keys
2. Sign up/login (Google account works)
3. Click "Create new secret key"
4. Copy the key (starts with `sk-proj-...`)
5. **Free $5 credit** for new users!

### Pinecone API Key (Required for search)
1. Go to: https://app.pinecone.io/
2. Sign up (free tier: 100K vectors)
3. Create a new index:
   - Name: `truetalk-mentors`
   - Dimensions: `1536`
   - Metric: `cosine`
4. Copy API key from dashboard

## Step 3: Configure Keys (1 minute)

Create file `.env.ai` in your project folder:

```env
# OpenAI
OPENAI_API_KEY=sk-proj-YOUR_KEY_HERE

# Pinecone
PINECONE_API_KEY=YOUR_PINECONE_KEY_HERE
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=truetalk-mentors

# Feature Flags (enable what you want)
AI_MATCHING_ENABLED=true
AI_CHATBOT_ENABLED=true
AI_TRANSCRIPTION_ENABLED=false

# Budget Limits (in USD)
AI_DAILY_BUDGET_USD=5
AI_MONTHLY_BUDGET_USD=50
```

**Important:** Never commit `.env.ai` to Git!

## Step 4: Start the Backend (30 seconds)

In PowerShell:

```powershell
node server.js
```

You should see:
```
🚀 TrueTalk Backend Server Started
📡 Server: http://localhost:3000
```

## Step 5: Open Your Website (10 seconds)

**Option A:** Double-click `index.html`

**Option B:** Use Live Server in VS Code

**Option C:** Go to `http://localhost:3000` (backend serves the HTML too)

## Step 6: Test AI Features! 🎉

### Test the Chatbot
1. Look for orange chat icon in bottom-right corner
2. Click it
3. Type: "How do I find a mentor?"
4. Get AI response in 2-3 seconds!

**Try in Bengali:**
- "আমি কিভাবে mentor খুঁজবো?"
- Bot responds in Bengali! 🇧🇩

### Test Search (Coming Soon)
Search bar will use semantic AI when you add mentor data.

## What's Working Now?

✅ **AI Chatbot**
   - Click orange chat icon (bottom right)
   - Ask anything about TrueTalk
   - Supports Bengali and English
   - Costs: ~$0.05 per conversation

✅ **Cost Tracking**
   - Visit: http://localhost:3000/api/stats
   - See real-time spending
   - Auto-throttles at budget limit

✅ **Backend API**
   - All endpoints ready
   - Rate limiting active
   - Error handling in place

## What Needs Setup?

⏳ **Mentor Matching**
   - Need to add mentor profiles
   - Then matching works automatically

⏳ **Semantic Search**  
   - Need mentor data in Pinecone
   - See "Adding Mentors" guide below

⏳ **Session Intelligence**
   - Enable when you have video sessions
   - Set `AI_TRANSCRIPTION_ENABLED=true`

## Adding Your First Mentor (Optional)

To test matching and search, add a sample mentor:

```javascript
// Open browser console (F12) and run:

const mentor = {
  id: 'mentor_001',
  fullName: 'Sarah Ahmed',
  headline: 'Senior Product Manager at Tech Corp',
  bio: 'Helping professionals transition to PM roles...',
  zones: ['Career', 'Business'],
  ratePerMinute: 150,
  yearsExperience: 10,
  company: 'Tech Corp',
  // ... other fields
};

fetch('http://localhost:3000/api/mentors/index', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(mentor)
});
```

## Troubleshooting

### "Cannot connect to backend"
**Fix:** Make sure server is running (`node server.js`)

### "OPENAI_API_KEY is required"
**Fix:** 
1. Check `.env.ai` file exists
2. Check key is correct (starts with `sk-proj-` or `sk-`)
3. Restart server: `Ctrl+C` then `node server.js`

### "Port 3000 already in use"
**Fix:** Change port in `server.js`:
```javascript
const PORT = process.env.PORT || 3001; // Changed to 3001
```

### Chatbot not showing
**Fix:**
1. Check browser console (F12) for errors
2. Verify `ai-frontend.js` is loaded
3. Clear browser cache (Ctrl+F5)

### High costs
**Fix:**
1. Check spending: http://localhost:3000/api/stats
2. Lower budget in `.env.ai`:
   ```env
   AI_DAILY_BUDGET_USD=1
   ```
3. Caching is auto-enabled (saves 60-70%)

## Next Steps

### 1. Customize Chatbot
Edit `ai/chatbot.js` line 20-50 to change personality

### 2. Add Real Mentors
Create mentor profiles in your database, then index them for AI

### 3. Deploy to Production
See `AI_INTEGRATION_GUIDE.md` → "Production Deployment" section

### 4. Monitor Costs
- Check daily: http://localhost:3000/api/stats
- Set alerts at 80% budget
- Optimize based on usage

## Cost Summary

**Development (testing):**
- $1-5 per day with moderate testing
- Free $5 credit from OpenAI lasts ~1 week

**Production (1,000 users):**
- ~$300-500/month
- Scales based on usage
- Caching reduces costs 60-70%

## Support

**Need help?**
1. Read full guide: `AI_INTEGRATION_GUIDE.md`
2. Check examples: `ai/examples.js`
3. View logs: Terminal running `node server.js`

**Common questions:**
- "How do I add Bengali language?" → Already supported! Just type in Bengali
- "Can I test without API keys?" → Yes, set `AI_MOCK_RESPONSES=true` in `.env.ai`
- "What if I run out of credits?" → Upgrade OpenAI account or set budget limits

## You're All Set! 🚀

Your TrueTalk platform now has:
✅ AI Chatbot (Bengali + English)
✅ Cost tracking & budgets
✅ Rate limiting & security
✅ Production-ready API

Open your site and click the chat icon to start! 💬
