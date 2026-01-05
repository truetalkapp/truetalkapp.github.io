/**
 * TrueTalk Semantic Search Module
 * Natural language search for mentors
 * 
 * Features:
 * - Semantic search using embeddings
 * - Hybrid search (vector + keyword)
 * - Query understanding with GPT
 * - Faceted filtering
 */

const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const { config, isFeatureEnabled } = require('./config');
const { trackCost, checkBudget } = require('./cost-tracker');
const { getCachedResponse, cacheResponse } = require('./cache');

class SemanticSearch {
  constructor() {
    // Lazy initialization - only create clients when needed
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
   * Search for mentors using natural language
   * @param {string} query - Natural language query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} - Search results
   */
  async search(query, options = {}) {
    try {
      if (!isFeatureEnabled('matching')) {
        return this.getFallbackSearch(query);
      }

      // Check cache first
      const cacheKey = `search:${query}:${JSON.stringify(options)}`;
      const cached = await getCachedResponse(cacheKey);
      if (cached) {
        return {
          results: cached,
          cached: true,
          cost: 0,
        };
      }

      if (!checkBudget('search')) {
        return this.getFallbackSearch(query);
      }

      const { topK = 10, filters = {}, userId = null } = options;

      console.log(`[SemanticSearch] Query: "${query}"`);

      // 1. Parse and understand the query
      const parsedQuery = await this.parseQuery(query);

      // 2. Generate query embedding
      const embedding = await this.generateEmbedding(parsedQuery.enrichedQuery);

      // 3. Build filters from parsed query
      const searchFilters = this.buildFilters(parsedQuery, filters);

      // 4. Vector search
      const vectorResults = await this.vectorSearch(embedding, topK * 2, searchFilters);

      // 5. Keyword search (for exact matches)
      const keywordResults = await this.keywordSearch(parsedQuery.keywords, searchFilters);

      // 6. Hybrid ranking
      const rankedResults = this.hybridRank(vectorResults, keywordResults, parsedQuery);

      // 7. Personalize if user is logged in
      if (userId) {
        await this.personalizeResults(rankedResults, userId);
      }

      const finalResults = rankedResults.slice(0, topK);

      // Cache results
      await cacheResponse(cacheKey, finalResults);

      return {
        results: finalResults,
        parsedQuery,
        cached: false,
      };
    } catch (error) {
      console.error('[SemanticSearch] Error:', error);
      return this.getFallbackSearch(query);
    }
  }

  /**
   * Parse natural language query
   */
  async parseQuery(query) {
    const prompt = `Parse this mentor search query and extract structured information.

Query: "${query}"

Extract the following as JSON:
{
  "intent": "What the user is trying to achieve (1 sentence)",
  "zone": "Which mentorship zone? (Career, Data/AI, Study Abroad, Business, Design, Finance, Marketing, Engineering, Healthcare, Legal, Personal Development, or null)",
  "keywords": ["important", "keywords", "to", "search"],
  "experience_level": "Experience level mentioned (beginner/mid-level/senior/expert or null)",
  "specific_requirements": ["any", "specific", "requirements"],
  "enrichedQuery": "Expanded version of the query with synonyms and related terms"
}

Examples:

Query: "someone who can help me get into Stanford"
{
  "intent": "Looking for study abroad guidance for Stanford admission",
  "zone": "Study Abroad",
  "keywords": ["Stanford", "admission", "university", "application"],
  "experience_level": null,
  "specific_requirements": ["Stanford", "top university"],
  "enrichedQuery": "Study abroad mentor with experience in Stanford admission, top university applications, Ivy League, competitive admissions, application strategy"
}

Query: "আমার startup এর জন্য business strategy mentor দরকার"
{
  "intent": "Need business strategy guidance for a startup",
  "zone": "Business",
  "keywords": ["startup", "business strategy", "entrepreneur"],
  "experience_level": null,
  "specific_requirements": ["startup experience"],
  "enrichedQuery": "Business strategy mentor with startup experience, entrepreneurship, business planning, growth strategy, startup scaling"
}`;

    const response = await this.openai.chat.completions.create({
      model: config.openai.models.chat,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.1,
    });

    const cost = this.calculateChatCost(response.usage);
    await trackCost('query-parsing', cost, response.usage);

    return JSON.parse(response.choices[0].message.content);
  }

  /**
   * Generate embedding for query
   */
  async generateEmbedding(text) {
    const response = await this.openai.embeddings.create({
      model: config.openai.models.embeddings,
      input: text,
    });

    const cost = (response.usage.total_tokens / 1_000_000) * 0.02;
    await trackCost('embedding', cost, response.usage);

    return response.data[0].embedding;
  }

  /**
   * Build Pinecone filters
   */
  buildFilters(parsedQuery, additionalFilters) {
    const filters = {
      is_verified: true,
      ...additionalFilters,
    };

    if (parsedQuery.zone) {
      filters.zones = { $contains: parsedQuery.zone };
    }

    return filters;
  }

  /**
   * Vector similarity search
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
      score: match.score,
      source: 'vector',
      metadata: match.metadata,
    }));
  }

  /**
   * Keyword search (simplified - in production use Elasticsearch)
   */
  async keywordSearch(keywords, filters) {
    // In production, implement with Elasticsearch
    // For now, return empty results
    // This would search in mentor bios, headlines, skills
    return [];
  }

  /**
   * Hybrid ranking (combine vector + keyword results)
   */
  hybridRank(vectorResults, keywordResults, parsedQuery) {
    // Combine results
    const combined = new Map();

    // Add vector results
    for (const result of vectorResults) {
      combined.set(result.mentorId, {
        ...result,
        vectorScore: result.score,
        keywordScore: 0,
      });
    }

    // Add/merge keyword results
    for (const result of keywordResults) {
      if (combined.has(result.mentorId)) {
        combined.get(result.mentorId).keywordScore = result.score;
      } else {
        combined.set(result.mentorId, {
          ...result,
          vectorScore: 0,
          keywordScore: result.score,
        });
      }
    }

    // Calculate hybrid score
    const results = Array.from(combined.values()).map((result) => {
      const hybridScore = result.vectorScore * 0.7 + result.keywordScore * 0.3;

      return {
        mentorId: result.mentorId,
        score: hybridScore,
        vectorScore: result.vectorScore,
        keywordScore: result.keywordScore,
        mentor: {
          id: result.mentorId,
          name: result.metadata.name,
          headline: result.metadata.headline,
          bio: result.metadata.bio,
          zones: result.metadata.zones,
          ratePerMinute: result.metadata.rate_per_minute,
          rating: result.metadata.average_rating,
          totalSessions: result.metadata.total_sessions,
          yearsExperience: result.metadata.years_experience,
          company: result.metadata.company,
          avatarUrl: result.metadata.avatar_url,
          isAvailableNow: result.metadata.is_available_now,
        },
      };
    });

    // Sort by hybrid score
    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Personalize results based on user history
   */
  async personalizeResults(results, userId) {
    // In production:
    // - Boost mentors from zones user has used before
    // - Promote mentors with similar ratings to user's preferences
    // - Consider user's past session topics

    // Placeholder: boost results by 10% if in user's preferred zone
    // const userProfile = await getUserProfile(userId);
    // for (const result of results) {
    //   if (userProfile.preferredZones.includes(result.mentor.zones[0])) {
    //     result.score *= 1.1;
    //   }
    // }
  }

  /**
   * Autocomplete suggestions
   */
  async getSuggestions(partialQuery, limit = 5) {
    // In production, implement autocomplete with:
    // 1. Common searches from analytics
    // 2. Trending topics
    // 3. GPT-based completions

    const prompt = `Generate ${limit} autocomplete suggestions for this partial search query in a mentorship platform:

Partial query: "${partialQuery}"

Available zones: Career, Data/AI, Study Abroad, Business, Design, Finance, Marketing, Engineering, Healthcare, Legal, Personal Development

Return as JSON array of strings:
["suggestion 1", "suggestion 2", ...]

Make suggestions natural and helpful.`;

    const response = await this.openai.chat.completions.create({
      model: config.openai.models.chat,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 150,
    });

    const cost = this.calculateChatCost(response.usage);
    await trackCost('autocomplete', cost, response.usage);

    const result = JSON.parse(response.choices[0].message.content);
    return result.suggestions || [];
  }

  /**
   * Calculate chat cost
   */
  calculateChatCost(usage) {
    const inputCost = (usage.prompt_tokens / 1_000_000) * 0.15;
    const outputCost = (usage.completion_tokens / 1_000_000) * 0.60;
    return inputCost + outputCost;
  }

  /**
   * Fallback search when AI unavailable
   */
  getFallbackSearch(query) {
    console.warn('[SemanticSearch] Using fallback search');
    return {
      results: [],
      fallback: true,
      message: 'Advanced search temporarily unavailable. Please try basic filters.',
    };
  }
}

// Singleton instance
const semanticSearch = new SemanticSearch();

module.exports = {
  SemanticSearch,
  search: (query, options) => semanticSearch.search(query, options),
  getSuggestions: (query, limit) => semanticSearch.getSuggestions(query, limit),
};
