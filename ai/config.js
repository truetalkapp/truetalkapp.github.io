/**
 * TrueTalk AI Configuration Module
 * Centralized configuration for all AI services
 */

const dotenv = require('dotenv');
const path = require('path');

// Load AI environment variables
dotenv.config({ path: path.join(__dirname, '../.env.ai') });

const config = {
  // LLM Provider Selection
  llm: {
    provider: process.env.LLM_PROVIDER || 'groq', // 'groq' (FREE) or 'openai' (paid)
  },

  // Groq Configuration (FREE!)
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    parameters: {
      temperature: parseFloat(process.env.AI_CHAT_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.AI_CHAT_MAX_TOKENS) || 500,
    },
  },

  // OpenAI Configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    organizationId: process.env.OPENAI_ORGANIZATION_ID,
    models: {
      chat: process.env.OPENAI_MODEL_CHAT || 'gpt-4o-mini',
      advanced: process.env.OPENAI_MODEL_ADVANCED || 'gpt-4o',
      embeddings: process.env.OPENAI_MODEL_EMBEDDINGS || 'text-embedding-3-small',
    },
    parameters: {
      temperature: parseFloat(process.env.AI_CHAT_TEMPERATURE) || 0.7,
      maxTokens: parseInt(process.env.AI_CHAT_MAX_TOKENS) || 500,
    },
  },

  // Pinecone Configuration
  pinecone: {
    apiKey: process.env.PINECONE_API_KEY,
    environment: process.env.PINECONE_ENVIRONMENT || 'us-east-1',
    indexName: process.env.PINECONE_INDEX_NAME || 'truetalk-mentors',
    dimension: parseInt(process.env.PINECONE_DIMENSION) || 1536,
  },

  // Google Cloud Configuration
  google: {
    apiKey: process.env.GOOGLE_CLOUD_API_KEY,
    projectId: process.env.GOOGLE_TRANSLATE_PROJECT_ID,
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  },

  // Feature Flags
  features: {
    matching: process.env.AI_MATCHING_ENABLED === 'true',
    chatbot: process.env.AI_CHATBOT_ENABLED === 'true',
    transcription: process.env.AI_TRANSCRIPTION_ENABLED === 'true',
    translation: process.env.AI_TRANSLATION_ENABLED === 'true',
    sentiment: process.env.AI_SENTIMENT_ANALYSIS_ENABLED === 'true',
    dynamicPricing: process.env.AI_DYNAMIC_PRICING_ENABLED === 'true',
  },

  // Cost Management
  costs: {
    dailyBudget: parseFloat(process.env.AI_DAILY_BUDGET_USD) || 50,
    monthlyBudget: parseFloat(process.env.AI_MONTHLY_BUDGET_USD) || 1500,
    alertThreshold: parseFloat(process.env.AI_COST_ALERT_THRESHOLD) || 0.8,
    rateLimitPerUserHour: parseInt(process.env.AI_RATE_LIMIT_PER_USER_HOUR) || 50,
  },

  // Cache Configuration
  cache: {
    enabled: process.env.AI_CACHE_ENABLED === 'true',
    ttl: parseInt(process.env.AI_CACHE_TTL_SECONDS) || 3600,
  },

  // Thresholds
  thresholds: {
    matchingConfidence: parseFloat(process.env.AI_MATCHING_CONFIDENCE_THRESHOLD) || 0.6,
    fraudDetection: parseFloat(process.env.AI_FRAUD_DETECTION_THRESHOLD) || 0.7,
  },

  // Monitoring
  monitoring: {
    logging: process.env.AI_LOGGING_ENABLED === 'true',
    logLevel: process.env.AI_LOG_LEVEL || 'info',
    metrics: process.env.AI_METRICS_ENABLED === 'true',
    sentryDsn: process.env.AI_SENTRY_DSN,
  },

  // Development
  dev: {
    devMode: process.env.AI_DEV_MODE === 'true',
    mockResponses: process.env.AI_MOCK_RESPONSES === 'true',
    skipCostChecks: process.env.AI_SKIP_COST_CHECKS === 'true',
  },
};

// Validation
function validateConfig() {
  const errors = [];

  // Check LLM provider API key based on selected provider
  const provider = config.llm.provider;
  if (provider === 'groq' && !config.groq.apiKey && !config.dev.mockResponses) {
    errors.push('GROQ_API_KEY is required when LLM_PROVIDER=groq');
  } else if (provider === 'openai' && !config.openai.apiKey && !config.dev.mockResponses) {
    errors.push('OPENAI_API_KEY is required when LLM_PROVIDER=openai');
  }

  if (config.features.matching && !config.pinecone.apiKey) {
    errors.push('PINECONE_API_KEY is required when AI_MATCHING_ENABLED is true');
  }

  if (config.features.translation && !config.google.apiKey) {
    errors.push('GOOGLE_CLOUD_API_KEY is required when AI_TRANSLATION_ENABLED is true');
  }

  if (errors.length > 0) {
    throw new Error(`AI Configuration errors:\n${errors.join('\n')}`);
  }
}

// Cost tracking helper
function getCostLimits() {
  return {
    daily: config.costs.dailyBudget,
    monthly: config.costs.monthlyBudget,
    alertAt: config.costs.dailyBudget * config.costs.alertThreshold,
  };
}

// Feature check helper
function isFeatureEnabled(featureName) {
  return config.features[featureName] === true;
}

// Export
module.exports = {
  config,
  validateConfig,
  getCostLimits,
  isFeatureEnabled,
};
