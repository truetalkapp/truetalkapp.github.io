/**
 * TrueTalk AI - Main Entry Point
 * 
 * Exports all AI modules for easy integration
 */

const { config, validateConfig, isFeatureEnabled, getCostLimits } = require('./config');
const { TrueTalkChatbot, quickResponses } = require('./chatbot');
const { AIMatchingEngine, findMatches, indexMentor, updateMentor, removeMentor } = require('./matching');
const { SessionIntelligence, formatInsightsForDisplay } = require('./session-intelligence');
const { SemanticSearch, search, getSuggestions } = require('./semantic-search');
const { trackCost, checkBudget, getStats, getCostBreakdown } = require('./cost-tracker');
const { getCachedResponse, cacheResponse, clearCache, clearAllCache, getCacheStats } = require('./cache');

// Validate configuration on startup
try {
  validateConfig();
  console.log('[TrueTalk AI] Configuration validated successfully');
} catch (error) {
  console.error('[TrueTalk AI] Configuration error:', error.message);
  if (!config.dev.mockResponses) {
    throw error;
  }
}

// Print enabled features
console.log('[TrueTalk AI] Enabled features:', {
  matching: isFeatureEnabled('matching'),
  chatbot: isFeatureEnabled('chatbot'),
  transcription: isFeatureEnabled('transcription'),
  translation: isFeatureEnabled('translation'),
  sentiment: isFeatureEnabled('sentiment'),
  dynamicPricing: isFeatureEnabled('dynamicPricing'),
});

// Export modules
module.exports = {
  // Configuration
  config,
  validateConfig,
  isFeatureEnabled,
  getCostLimits,

  // Chatbot
  TrueTalkChatbot,
  quickResponses,

  // Matching
  AIMatchingEngine,
  findMatches,
  indexMentor,
  updateMentor,
  removeMentor,

  // Session Intelligence
  SessionIntelligence,
  formatInsightsForDisplay,

  // Search
  SemanticSearch,
  search,
  getSuggestions,

  // Cost Management
  trackCost,
  checkBudget,
  getStats,
  getCostBreakdown,

  // Cache
  getCachedResponse,
  cacheResponse,
  clearCache,
  clearAllCache,
  getCacheStats,
};
