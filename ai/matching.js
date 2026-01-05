/**
 * TrueTalk AI Matching Engine
 * Matches mentees with optimal mentors using ML algorithms
 * 
 * Features:
 * - Semantic similarity matching
 * - Multi-factor ranking
 * - Real-time availability filtering
 * - Personalization based on history
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const { config, isFeatureEnabled } = require('./config');
const { trackCost, checkBudget } = require('./cost-tracker');

class AIMatchingEngine {
  constructor() {
    // Lazy initialization - only create clients when actually needed
    this._openai = null;
    this._pinecone = null;
    this._index = null;
  }

  get openai() {
    if (!this._openai && config.openai.apiKey) {
      this._openai = new OpenAI({
        apiKey: config.openai.apiKey,
      });
    }
    return this._openai;
  }

  get pinecone() {
    if (!this._pinecone && config.pinecone.apiKey) {
      this._pinecone = new Pinecone({
        apiKey: config.pinecone.apiKey,
        environment: config.pinecone.environment,
      });
    }
    return this._pinecone;
  }

  get index() {
    if (!this._index && this.pinecone) {
      this._index = this.pinecone.index(config.pinecone.indexName);
    }
    return this._index;
  }

  /**
   * Find matching mentors for a mentee
   * @param {Object} menteeProfile - Mentee profile and requirements
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Ranked list of mentor matches
   */
  async findMatches(menteeProfile, options = {}) {
    try {
      if (!isFeatureEnabled('matching')) {
        throw new Error('AI matching is currently disabled');
      }

      if (!checkBudget('matching')) {
        return this.getFallbackMatches(menteeProfile);
      }

      const {
        topK = 10,
        zone = null,
        maxBudget = null,
        includeExplanation = true,
      } = options;

      // 1. Generate query embedding from mentee profile
      const queryEmbedding = await this.generateQueryEmbedding(menteeProfile);

      // 2. Build filters
      const filters = this.buildFilters(menteeProfile, { zone, maxBudget });

      // 3. Vector similarity search
      const candidates = await this.vectorSearch(queryEmbedding, topK * 3, filters);

      // 4. Re-rank with business logic
      const rankedMentors = await this.rerank(candidates, menteeProfile);

      // 5. Add explanations if requested
      if (includeExplanation) {
        await this.addMatchExplanations(rankedMentors, menteeProfile);
      }

      return rankedMentors.slice(0, topK);
    } catch (error) {
      console.error('[AIMatching] Error:', error);
      return this.getFallbackMatches(menteeProfile);
    }
  }

  /**
   * Generate embedding for mentee query
   */
  async generateQueryEmbedding(menteeProfile) {
    const queryText = this.buildQueryText(menteeProfile);

    const response = await this.openai.embeddings.create({
      model: config.openai.models.embeddings,
      input: queryText,
    });

    // Track cost
    const cost = (response.usage.total_tokens / 1_000_000) * 0.02;
    await trackCost('embedding', cost, response.usage);

    return response.data[0].embedding;
  }

  /**
   * Build query text from mentee profile
   */
  buildQueryText(menteeProfile) {
    const parts = [];

    if (menteeProfile.goal) {
      parts.push(`Goal: ${menteeProfile.goal}`);
    }

    if (menteeProfile.zone) {
      parts.push(`Zone: ${menteeProfile.zone}`);
    }

    if (menteeProfile.currentRole) {
      parts.push(`Current role: ${menteeProfile.currentRole}`);
    }

    if (menteeProfile.experienceLevel) {
      parts.push(`Experience level: ${menteeProfile.experienceLevel}`);
    }

    if (menteeProfile.specificNeeds) {
      parts.push(`Specific needs: ${menteeProfile.specificNeeds}`);
    }

    if (menteeProfile.preferredLanguage) {
      parts.push(`Preferred language: ${menteeProfile.preferredLanguage}`);
    }

    return parts.join('\n');
  }

  /**
   * Build Pinecone filters
   */
  buildFilters(menteeProfile, options) {
    const filters = {
      is_available: true,
      is_verified: true,
    };

    if (options.zone) {
      filters.zones = { $contains: options.zone };
    }

    if (options.maxBudget) {
      filters.rate_per_minute = { $lte: options.maxBudget };
    }

    if (menteeProfile.preferredLanguage) {
      filters.languages = { $contains: menteeProfile.preferredLanguage };
    }

    return filters;
  }

  /**
   * Perform vector similarity search
   */
  async vectorSearch(embedding, topK, filters) {
    const queryResponse = await this.index.query({
      vector: embedding,
      topK,
      filter: filters,
      includeMetadata: true,
    });

    return queryResponse.matches.map((match) => ({
      mentorId: match.id,
      semanticScore: match.score,
      metadata: match.metadata,
    }));
  }

  /**
   * Re-rank candidates with business logic
   */
  async rerank(candidates, menteeProfile) {
    const ranked = candidates.map((candidate) => {
      const mentor = candidate.metadata;

      // Scoring factors
      const semanticScore = candidate.semanticScore * 0.4;
      const ratingScore = (mentor.average_rating / 5.0) * 0.3;
      const responseScore = (mentor.response_rate || 0.8) * 0.15;
      const availabilityScore = (1 - (mentor.current_load || 0)) * 0.1;
      const completionScore = (mentor.session_completion_rate || 0.9) * 0.05;

      const finalScore = semanticScore + ratingScore + responseScore + availabilityScore + completionScore;

      return {
        mentorId: candidate.mentorId,
        score: finalScore,
        breakdown: {
          semantic: semanticScore,
          rating: ratingScore,
          response: responseScore,
          availability: availabilityScore,
          completion: completionScore,
        },
        mentor: {
          id: candidate.mentorId,
          name: mentor.name,
          headline: mentor.headline,
          avatar: mentor.avatar_url,
          zones: mentor.zones,
          ratePerMinute: mentor.rate_per_minute,
          rating: mentor.average_rating,
          totalSessions: mentor.total_sessions,
          responseRate: mentor.response_rate,
          yearsExperience: mentor.years_experience,
          company: mentor.company,
          isAvailableNow: mentor.is_available_now,
        },
      };
    });

    // Sort by final score
    return ranked.sort((a, b) => b.score - a.score);
  }

  /**
   * Add AI-generated match explanations
   */
  async addMatchExplanations(rankedMentors, menteeProfile) {
    // Only generate explanations for top 3 to save costs
    const topMentors = rankedMentors.slice(0, 3);

    for (const match of topMentors) {
      const explanation = await this.generateExplanation(match, menteeProfile);
      match.explanation = explanation;
    }
  }

  /**
   * Generate explanation for a match
   */
  async generateExplanation(match, menteeProfile) {
    const prompt = `Explain in 1-2 sentences why ${match.mentor.name} is a good match for this mentee.

Mentee Profile:
- Goal: ${menteeProfile.goal}
- Zone: ${menteeProfile.zone}
- Experience: ${menteeProfile.experienceLevel}

Mentor Profile:
- Name: ${match.mentor.name}
- Headline: ${match.mentor.headline}
- Zones: ${match.mentor.zones.join(', ')}
- Experience: ${match.mentor.yearsExperience} years
- Company: ${match.mentor.company}
- Rating: ${match.mentor.rating}/5

Be specific and encouraging. Write in ${menteeProfile.preferredLanguage === 'bn' ? 'Bengali' : 'English'}.`;

    const response = await this.openai.chat.completions.create({
      model: config.openai.models.chat,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
      temperature: 0.7,
    });

    const cost = this.calculateChatCost(response.usage);
    await trackCost('matching-explanation', cost, response.usage);

    return response.choices[0].message.content.trim();
  }

  /**
   * Calculate OpenAI chat cost
   */
  calculateChatCost(usage) {
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }

  /**
   * Fallback matching when AI is unavailable
   */
  getFallbackMatches(menteeProfile) {
    console.warn('[AIMatching] Using fallback matching');
    // Return database-based matches without AI
    return [];
  }

  /**
   * Index a mentor profile in vector database
   */
  async indexMentor(mentor) {
    try {
      const embedding = await this.generateMentorEmbedding(mentor);

      await this.index.upsert([
        {
          id: mentor.id,
          values: embedding,
          metadata: {
            name: mentor.fullName,
            headline: mentor.headline,
            bio: mentor.bio,
            zones: mentor.zones,
            rate_per_minute: mentor.ratePerMinute,
            average_rating: mentor.averageRating || 0,
            total_sessions: mentor.totalSessions || 0,
            response_rate: mentor.responseRate || 1.0,
            years_experience: mentor.yearsExperience,
            company: mentor.company,
            languages: mentor.languages || ['en', 'bn'],
            is_available: mentor.isAvailable,
            is_verified: mentor.isVerified,
            is_available_now: mentor.isAvailableNow || false,
            current_load: mentor.currentLoad || 0,
            session_completion_rate: mentor.sessionCompletionRate || 1.0,
            avatar_url: mentor.avatarUrl,
          },
        },
      ]);

      console.log(`[AIMatching] Indexed mentor: ${mentor.id}`);
    } catch (error) {
      console.error('[AIMatching] Error indexing mentor:', error);
    }
  }

  /**
   * Generate embedding for mentor profile
   */
  async generateMentorEmbedding(mentor) {
    const profileText = `
${mentor.headline}

Bio: ${mentor.bio}

Specializations: ${mentor.zones.join(', ')}

Experience: ${mentor.yearsExperience} years at ${mentor.company}

Skills: ${(mentor.skills || []).join(', ')}
    `.trim();

    const response = await this.openai.embeddings.create({
      model: config.openai.models.embeddings,
      input: profileText,
    });

    const cost = (response.usage.total_tokens / 1_000_000) * 0.02;
    await trackCost('embedding', cost, response.usage);

    return response.data[0].embedding;
  }

  /**
   * Remove mentor from index
   */
  async removeMentor(mentorId) {
    await this.index.deleteOne(mentorId);
    console.log(`[AIMatching] Removed mentor: ${mentorId}`);
  }

  /**
   * Update mentor in index
   */
  async updateMentor(mentor) {
    await this.removeMentor(mentor.id);
    await this.indexMentor(mentor);
  }
}

// Singleton instance
const matchingEngine = new AIMatchingEngine();

module.exports = {
  AIMatchingEngine,
  findMatches: (profile, options) => matchingEngine.findMatches(profile, options),
  indexMentor: (mentor) => matchingEngine.indexMentor(mentor),
  updateMentor: (mentor) => matchingEngine.updateMentor(mentor),
  removeMentor: (mentorId) => matchingEngine.removeMentor(mentorId),
};
