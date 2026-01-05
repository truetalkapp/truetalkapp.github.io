/**
 * TrueTalk Session Intelligence Module
 * Transcribes and analyzes mentorship sessions
 * 
 * Features:
 * - Audio/video transcription (Bengali + English)
 * - Session summarization
 * - Action item extraction
 * - Key topics identification
 * - Follow-up recommendations
 */

const OpenAI = require('openai');
const { config, isFeatureEnabled } = require('./config');
const { trackCost, checkBudget } = require('./cost-tracker');

class SessionIntelligence {
  constructor() {
    // Lazy initialization - only create client when needed
    this._openai = null;
  }

  get openai() {
    if (!this._openai && config.openai.apiKey) {
      this._openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    }
    return this._openai;
  }

  /**
   * Process complete session
   * @param {string} audioUrl - URL to session audio file
   * @param {Object} sessionData - Session metadata
   * @returns {Promise<Object>} - Processed insights
   */
  async processSession(audioUrl, sessionData) {
    try {
      if (!isFeatureEnabled('transcription')) {
        throw new Error('Session intelligence is currently disabled');
      }

      if (!checkBudget('transcription')) {
        return this.getMinimalSummary(sessionData);
      }

      console.log(`[SessionIntelligence] Processing session: ${sessionData.id}`);

      // 1. Transcribe audio
      const transcript = await this.transcribe(audioUrl);

      // 2. Generate insights
      const insights = await this.analyzeTranscript(transcript, sessionData);

      // 3. Store results (in production, save to database)
      await this.storeResults(sessionData.id, transcript, insights);

      // 4. Send to participants
      await this.notifyParticipants(sessionData, insights);

      return {
        transcript,
        insights,
        success: true,
      };
    } catch (error) {
      console.error('[SessionIntelligence] Error:', error);
      return {
        error: error.message,
        success: false,
      };
    }
  }

  /**
   * Transcribe audio using Whisper API
   * @param {string} audioUrl - URL to audio file
   * @returns {Promise<Object>} - Transcript with timestamps
   */
  async transcribe(audioUrl) {
    try {
      // Download audio file
      const audioFile = await this.downloadAudio(audioUrl);

      // Transcribe with Whisper
      const response = await this.openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
        response_format: 'verbose_json',
        timestamp_granularities: ['segment'],
      });

      // Calculate cost ($0.006 per minute)
      const durationMinutes = this.estimateAudioDuration(response);
      const cost = durationMinutes * 0.006;
      await trackCost('transcription', cost, {
        duration_minutes: durationMinutes,
        language: response.language,
      });

      return {
        text: response.text,
        segments: response.segments,
        language: response.language,
        duration: response.duration,
      };
    } catch (error) {
      console.error('[SessionIntelligence] Transcription error:', error);
      throw error;
    }
  }

  /**
   * Analyze transcript and generate insights
   */
  async analyzeTranscript(transcript, sessionData) {
    const prompt = this.buildAnalysisPrompt(transcript, sessionData);

    const response = await this.openai.chat.completions.create({
      model: config.openai.models.chat,
      messages: [
        {
          role: 'system',
          content: 'You are an expert at analyzing mentorship sessions and extracting valuable insights.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    // Calculate cost
    const cost = this.calculateChatCost(response.usage);
    await trackCost('session-analysis', cost, response.usage);

    const insights = JSON.parse(response.choices[0].message.content);

    return insights;
  }

  /**
   * Build analysis prompt
   */
  buildAnalysisPrompt(transcript, sessionData) {
    return `Analyze this mentorship session transcript and provide comprehensive insights.

**Session Details:**
- Zone: ${sessionData.zone}
- Duration: ${sessionData.durationMinutes} minutes
- Mentor: ${sessionData.mentorName}
- Mentee: ${sessionData.menteeName}

**Transcript:**
${transcript.text}

**Generate the following in JSON format:**

{
  "summary": "3-sentence executive summary of the session",
  "key_topics": ["topic1", "topic2", "topic3"],
  "action_items": [
    {
      "description": "Action item description",
      "assignee": "mentee/mentor",
      "priority": "high/medium/low",
      "deadline": "suggested deadline if mentioned, or null"
    }
  ],
  "notable_quotes": [
    {
      "quote": "Exact quote from transcript",
      "speaker": "mentor/mentee",
      "significance": "Why this quote is important"
    }
  ],
  "resources_mentioned": ["resource1", "resource2"],
  "follow_up_topics": ["topic1", "topic2"],
  "mentee_goals": ["goal1", "goal2"],
  "mentor_advice": ["key advice 1", "key advice 2"],
  "session_quality_score": 0-10,
  "engagement_level": "high/medium/low",
  "recommended_next_steps": ["step1", "step2"]
}

**Guidelines:**
- Be specific and actionable
- Extract verbatim quotes for notable_quotes
- Identify concrete action items with deadlines
- Suggest realistic follow-up topics
- Write in the same language as the transcript (${transcript.language === 'bn' ? 'Bengali' : 'English'})
`;
  }

  /**
   * Generate session summary for email
   */
  async generateEmailSummary(insights, sessionData, recipientType) {
    const prompt = `Create a follow-up email for the ${recipientType} after this mentorship session.

**Session Details:**
- Zone: ${sessionData.zone}
- Duration: ${sessionData.durationMinutes} minutes
- ${recipientType === 'mentee' ? 'Mentor' : 'Mentee'}: ${recipientType === 'mentee' ? sessionData.mentorName : sessionData.menteeName}

**Session Summary:**
${insights.summary}

**Key Topics:**
${insights.key_topics.join(', ')}

**Action Items:**
${insights.action_items.map(item => `- ${item.description}`).join('\n')}

**Create an email that:**
1. Thanks them for the session
2. Highlights 1-2 key takeaways
3. Lists their specific action items (if any)
4. Recommends next steps
5. Encourages booking another session (for mentee) or staying available (for mentor)

Keep it concise (under 250 words), warm, and encouraging.
Write in ${sessionData.language === 'bn' ? 'Bengali' : 'English'}.
Format as clean HTML for email.
`;

    const response = await this.openai.chat.completions.create({
      model: config.openai.models.chat,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 500,
    });

    const cost = this.calculateChatCost(response.usage);
    await trackCost('email-generation', cost, response.usage);

    return response.choices[0].message.content;
  }

  /**
   * Calculate chat completion cost
   */
  calculateChatCost(usage) {
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }

  /**
   * Estimate audio duration from transcription response
   */
  estimateAudioDuration(transcriptionResponse) {
    return transcriptionResponse.duration / 60; // Convert seconds to minutes
  }

  /**
   * Download audio file (placeholder - implement actual download)
   */
  async downloadAudio(audioUrl) {
    // In production, download from S3/storage
    // For now, return the URL assuming it's accessible
    const fs = require('fs');
    const fetch = require('node-fetch');

    const response = await fetch(audioUrl);
    const buffer = await response.buffer();

    // Save temporarily
    const tempPath = `/tmp/session-${Date.now()}.mp3`;
    fs.writeFileSync(tempPath, buffer);

    return fs.createReadStream(tempPath);
  }

  /**
   * Store results in database (placeholder)
   */
  async storeResults(sessionId, transcript, insights) {
    // In production:
    // await db.sessionTranscripts.create({
    //   session_id: sessionId,
    //   transcript: transcript.text,
    //   segments: transcript.segments,
    //   insights: insights,
    //   created_at: new Date()
    // });

    console.log(`[SessionIntelligence] Stored results for session: ${sessionId}`);
  }

  /**
   * Send insights to participants
   */
  async notifyParticipants(sessionData, insights) {
    // Generate personalized emails
    const menteeEmail = await this.generateEmailSummary(insights, sessionData, 'mentee');
    const mentorEmail = await this.generateEmailSummary(insights, sessionData, 'mentor');

    // In production, send via email service
    console.log(`[SessionIntelligence] Would send emails to mentee and mentor`);
    
    // await emailService.send({
    //   to: sessionData.menteeEmail,
    //   subject: `Your TrueTalk Session Summary - ${sessionData.zone}`,
    //   html: menteeEmail
    // });

    return {
      menteeEmail,
      mentorEmail,
    };
  }

  /**
   * Get minimal summary when budget exceeded
   */
  getMinimalSummary(sessionData) {
    return {
      summary: `${sessionData.zone} mentorship session between ${sessionData.mentorName} and ${sessionData.menteeName}.`,
      note: 'Full transcription unavailable due to budget constraints. Upgrade to access AI-powered session insights.',
      success: false,
    };
  }

  /**
   * Search transcripts by keyword
   */
  async searchTranscripts(userId, query) {
    // In production, implement full-text search with Elasticsearch
    // This is a placeholder implementation
    return {
      results: [],
      message: 'Search functionality coming soon',
    };
  }

  /**
   * Get session highlights (most important moments)
   */
  async getHighlights(sessionId) {
    // Extract key moments from transcript segments
    // Use sentiment analysis and importance scoring
    return {
      highlights: [],
      message: 'Highlights feature coming soon',
    };
  }
}

// Helper: Format insights for display
function formatInsightsForDisplay(insights) {
  return `
# Session Summary

${insights.summary}

## Key Topics Discussed
${insights.key_topics.map(topic => `- ${topic}`).join('\n')}

## Action Items
${insights.action_items.map(item => `
- [ ] ${item.description} (${item.priority} priority)
  - Assignee: ${item.assignee}
  ${item.deadline ? `- Deadline: ${item.deadline}` : ''}
`).join('\n')}

## Notable Quotes
${insights.notable_quotes.map(q => `
> "${q.quote}"
> — ${q.speaker}

*${q.significance}*
`).join('\n')}

## Resources Mentioned
${insights.resources_mentioned.map(r => `- ${r}`).join('\n')}

## Recommended Next Steps
${insights.recommended_next_steps.map(step => `- ${step}`).join('\n')}

## Follow-up Topics for Future Sessions
${insights.follow_up_topics.map(topic => `- ${topic}`).join('\n')}

---

**Session Quality Score:** ${insights.session_quality_score}/10
**Engagement Level:** ${insights.engagement_level}
  `.trim();
}

// Export
module.exports = {
  SessionIntelligence,
  formatInsightsForDisplay,
};
