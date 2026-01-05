/**
 * AI Cost Tracker
 * Monitors and controls AI API spending
 */

const redis = require('redis');
const { config } = require('./config');

class CostTracker {
  constructor() {
    // Check if Redis is enabled
    const redisEnabled = process.env.REDIS_ENABLED === 'true';
    this.useRedis = redisEnabled && !config.dev.devMode;
    this.costs = {
      today: 0,
      month: 0,
      lastReset: new Date().toISOString().split('T')[0],
    };

    if (this.useRedis) {
      try {
        this.redis = redis.createClient();
        this.redis.connect().catch(err => {
          console.warn('[CostTracker] Redis unavailable, using in-memory tracking:', err.message);
          this.useRedis = false;
        });
      } catch (error) {
        console.warn('[CostTracker] Redis unavailable, using in-memory tracking');
        this.useRedis = false;
      }
    }
  }

  /**
   * Track AI API cost
   */
  async trackCost(service, costUSD, usage = {}) {
    const costBDT = costUSD * 110; // Approximate USD to BDT conversion
    const today = new Date().toISOString().split('T')[0];

    const record = {
      timestamp: new Date().toISOString(),
      service,
      costUSD,
      costBDT,
      usage,
    };

    // Update daily total
    if (this.useRedis) {
      await this.redis.incrbyfloat(`cost:daily:${today}`, costUSD);
      await this.redis.lpush(`cost:log:${today}`, JSON.stringify(record));
      await this.redis.expire(`cost:log:${today}`, 90 * 24 * 60 * 60); // 90 days
    } else {
      if (this.costs.lastReset !== today) {
        this.costs.today = 0;
        this.costs.lastReset = today;
      }
      this.costs.today += costUSD;
      this.costs.month += costUSD;
    }

    // Check if approaching budget limit
    await this.checkBudgetAlert();

    // Log to analytics
    this.logCost(record);

    return record;
  }

  /**
   * Check if budget allows for more API calls
   */
  async checkBudget(service) {
    if (config.dev.skipCostChecks) {
      return true;
    }

    const today = new Date().toISOString().split('T')[0];
    let dailyCost = 0;

    if (this.useRedis) {
      dailyCost = parseFloat(await this.redis.get(`cost:daily:${today}`)) || 0;
    } else {
      dailyCost = this.costs.today;
    }

    const budgetLimit = config.costs.dailyBudget;
    const remaining = budgetLimit - dailyCost;

    if (remaining <= 0) {
      console.warn(`[CostTracker] Daily budget exceeded: $${dailyCost.toFixed(2)}/$${budgetLimit}`);
      return false;
    }

    return true;
  }

  /**
   * Get current cost statistics
   */
  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const month = today.slice(0, 7); // YYYY-MM

    if (this.useRedis) {
      const dailyCost = parseFloat(await this.redis.get(`cost:daily:${today}`)) || 0;
      const monthlyCost = await this.getMonthlyTotal(month);

      return {
        today: dailyCost,
        month: monthlyCost,
        dailyBudget: config.costs.dailyBudget,
        monthlyBudget: config.costs.monthlyBudget,
        dailyRemaining: Math.max(0, config.costs.dailyBudget - dailyCost),
        monthlyRemaining: Math.max(0, config.costs.monthlyBudget - monthlyCost),
        utilizationDaily: (dailyCost / config.costs.dailyBudget) * 100,
        utilizationMonthly: (monthlyCost / config.costs.monthlyBudget) * 100,
      };
    } else {
      return {
        today: this.costs.today,
        month: this.costs.month,
        dailyBudget: config.costs.dailyBudget,
        monthlyBudget: config.costs.monthlyBudget,
        dailyRemaining: Math.max(0, config.costs.dailyBudget - this.costs.today),
        monthlyRemaining: Math.max(0, config.costs.monthlyBudget - this.costs.month),
        utilizationDaily: (this.costs.today / config.costs.dailyBudget) * 100,
        utilizationMonthly: (this.costs.month / config.costs.monthlyBudget) * 100,
      };
    }
  }

  /**
   * Get monthly total cost
   */
  async getMonthlyTotal(month) {
    if (!this.useRedis) {
      return this.costs.month;
    }

    // Sum all daily costs for the month
    const keys = await this.redis.keys(`cost:daily:${month}-*`);
    let total = 0;

    for (const key of keys) {
      const value = parseFloat(await this.redis.get(key)) || 0;
      total += value;
    }

    return total;
  }

  /**
   * Check and send budget alerts
   */
  async checkBudgetAlert() {
    const stats = await this.getStats();

    if (stats.utilizationDaily >= config.costs.alertThreshold * 100) {
      await this.sendAlert('daily', stats);
    }

    if (stats.utilizationMonthly >= config.costs.alertThreshold * 100) {
      await this.sendAlert('monthly', stats);
    }
  }

  /**
   * Send budget alert
   */
  async sendAlert(period, stats) {
    const message = `
🚨 TrueTalk AI Budget Alert

${period === 'daily' ? 'Daily' : 'Monthly'} AI spending has reached ${stats[`utilization${period.charAt(0).toUpperCase() + period.slice(1)}`].toFixed(1)}% of budget.

Current: $${stats[period].toFixed(2)}
Budget: $${period === 'daily' ? stats.dailyBudget : stats.monthlyBudget}
Remaining: $${period === 'daily' ? stats.dailyRemaining.toFixed(2) : stats.monthlyRemaining.toFixed(2)}

Please review usage and consider implementing cost optimization measures.
    `;

    console.warn(message);

    // In production, send email/Slack notification
    // await sendNotification({ channel: 'ai-alerts', message });
  }

  /**
   * Log cost record
   */
  logCost(record) {
    if (config.monitoring.logging) {
      console.log('[CostTracker]', JSON.stringify(record));
    }
  }

  /**
   * Get cost breakdown by service
   */
  async getCostBreakdown(date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];

    if (!this.useRedis) {
      return { error: 'Breakdown only available with Redis' };
    }

    const logs = await this.redis.lrange(`cost:log:${targetDate}`, 0, -1);
    const breakdown = {};

    for (const log of logs) {
      const record = JSON.parse(log);
      if (!breakdown[record.service]) {
        breakdown[record.service] = {
          count: 0,
          totalCost: 0,
          avgCost: 0,
        };
      }

      breakdown[record.service].count++;
      breakdown[record.service].totalCost += record.costUSD;
    }

    // Calculate averages
    for (const service in breakdown) {
      breakdown[service].avgCost = breakdown[service].totalCost / breakdown[service].count;
    }

    return breakdown;
  }
}

// Singleton instance
const costTracker = new CostTracker();

module.exports = {
  trackCost: (service, cost, usage) => costTracker.trackCost(service, cost, usage),
  checkBudget: (service) => costTracker.checkBudget(service),
  getStats: () => costTracker.getStats(),
  getCostBreakdown: (date) => costTracker.getCostBreakdown(date),
};
