/**
 * AI Response Cache
 * Reduces API costs by caching common responses
 */

const redis = require('redis');
const { config } = require('./config');

class AICache {
  constructor() {
    // Check if Redis is enabled in config
    const redisEnabled = process.env.REDIS_ENABLED === 'true';
    this.useRedis = redisEnabled && !config.dev.devMode && config.cache.enabled;
    this.ttl = config.cache.ttl;
    
    // In-memory fallback
    this.memoryCache = new Map();

    if (this.useRedis) {
      try {
        this.redis = redis.createClient();
        this.redis.connect().catch(err => {
          console.warn('[Cache] Redis connection failed, using in-memory cache:', err.message);
          this.useRedis = false;
        });
      } catch (error) {
        console.warn('[Cache] Redis unavailable, using in-memory cache');
        this.useRedis = false;
      }
    }
  }

  /**
   * Get cached response
   */
  async get(key) {
    if (!config.cache.enabled) {
      return null;
    }

    if (this.useRedis) {
      const value = await this.redis.get(`ai:cache:${key}`);
      return value ? JSON.parse(value) : null;
    } else {
      const cached = this.memoryCache.get(key);
      if (cached && Date.now() < cached.expires) {
        return cached.value;
      }
      return null;
    }
  }

  /**
   * Cache a response
   */
  async set(key, value) {
    if (!config.cache.enabled) {
      return;
    }

    if (this.useRedis) {
      await this.redis.setex(
        `ai:cache:${key}`,
        this.ttl,
        JSON.stringify(value)
      );
    } else {
      this.memoryCache.set(key, {
        value,
        expires: Date.now() + this.ttl * 1000,
      });
    }
  }

  /**
   * Clear specific cache entry
   */
  async clear(key) {
    if (this.useRedis) {
      await this.redis.del(`ai:cache:${key}`);
    } else {
      this.memoryCache.delete(key);
    }
  }

  /**
   * Clear all cache
   */
  async clearAll() {
    if (this.useRedis) {
      const keys = await this.redis.keys('ai:cache:*');
      if (keys.length > 0) {
        await this.redis.del(keys);
      }
    } else {
      this.memoryCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  async getStats() {
    if (this.useRedis) {
      const keys = await this.redis.keys('ai:cache:*');
      return {
        entries: keys.length,
        storage: 'redis',
      };
    } else {
      return {
        entries: this.memoryCache.size,
        storage: 'memory',
      };
    }
  }
}

// Singleton instance
const aiCache = new AICache();

module.exports = {
  getCachedResponse: (key) => aiCache.get(key),
  cacheResponse: (key, value) => aiCache.set(key, value),
  clearCache: (key) => aiCache.clear(key),
  clearAllCache: () => aiCache.clearAll(),
  getCacheStats: () => aiCache.getStats(),
};
