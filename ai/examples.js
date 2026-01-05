/**
 * TrueTalk AI - Usage Examples
 * 
 * This file demonstrates how to use each AI module
 */

// ===========================================
// 1. CHATBOT USAGE
// ===========================================

async function chatbotExample() {
  const { TrueTalkChatbot } = require('./chatbot');
  const chatbot = new TrueTalkChatbot();

  // Simple chat
  const response = await chatbot.chat([
    { role: 'user', content: 'How do I find a mentor for career guidance?' }
  ], {
    userId: 'user_123',
    language: 'en'
  });

  console.log('Bot:', response.message);
  console.log('Cost:', `$${response.cost.toFixed(4)}`);

  // Bengali conversation
  const bengaliResponse = await chatbot.chat([
    { role: 'user', content: 'আমি কিভাবে একজন career mentor খুঁজবো?' }
  ], {
    userId: 'user_456',
    language: 'bn'
  });

  console.log('Bot (Bengali):', bengaliResponse.message);

  // Multi-turn conversation
  const conversation = [
    { role: 'user', content: 'I want to study abroad' },
    { role: 'assistant', content: 'Great! Which country are you interested in?' },
    { role: 'user', content: 'USA, for a master\'s degree in computer science' }
  ];

  const adviceResponse = await chatbot.chat(conversation, {
    userId: 'user_789',
    currentPage: '/study-abroad'
  });

  console.log('Bot:', adviceResponse.message);
}

// ===========================================
// 2. MENTOR MATCHING USAGE
// ===========================================

async function matchingExample() {
  const { findMatches, indexMentor } = require('./matching');

  // Index a new mentor
  await indexMentor({
    id: 'mentor_001',
    fullName: 'Sarah Ahmed',
    headline: 'Senior Product Manager at Tech Corp',
    bio: 'Helping professionals transition to PM roles. 10+ years in product management at top tech companies. Expert in product strategy, user research, and team leadership.',
    zones: ['Career', 'Business'],
    ratePerMinute: 150,
    averageRating: 4.8,
    totalSessions: 234,
    responseRate: 0.95,
    yearsExperience: 10,
    company: 'Tech Corp',
    languages: ['en', 'bn'],
    isAvailable: true,
    isVerified: true,
    isAvailableNow: true,
    currentLoad: 0.3,
    sessionCompletionRate: 0.98,
    avatarUrl: 'https://example.com/sarah.jpg',
    skills: ['Product Management', 'Product Strategy', 'User Research', 'Agile'],
  });

  // Find matches for a mentee
  const matches = await findMatches({
    goal: 'I want to transition from software engineering to product management',
    zone: 'Career',
    experienceLevel: 'Mid-level',
    currentRole: 'Software Engineer',
    specificNeeds: 'PM interview preparation',
    preferredLanguage: 'en',
    budget: 200 // BDT per minute
  }, {
    topK: 5,
    includeExplanation: true
  });

  console.log('Top Matches:');
  matches.forEach((match, index) => {
    console.log(`\n${index + 1}. ${match.mentor.name}`);
    console.log(`   Score: ${match.score.toFixed(3)}`);
    console.log(`   Rate: ৳${match.mentor.ratePerMinute}/min`);
    console.log(`   Rating: ${match.mentor.rating}/5`);
    if (match.explanation) {
      console.log(`   Why: ${match.explanation}`);
    }
  });
}

// ===========================================
// 3. SESSION INTELLIGENCE USAGE
// ===========================================

async function sessionIntelligenceExample() {
  const { SessionIntelligence, formatInsightsForDisplay } = require('./session-intelligence');
  const intelligence = new SessionIntelligence();

  // Process a completed session
  const result = await intelligence.processSession(
    'https://s3.amazonaws.com/sessions/session_123.mp3',
    {
      id: 'session_123',
      zone: 'Career',
      durationMinutes: 30,
      mentorName: 'Sarah Ahmed',
      menteeName: 'Rafiq Hasan',
      mentorEmail: 'sarah@example.com',
      menteeEmail: 'rafiq@example.com',
      language: 'en'
    }
  );

  if (result.success) {
    console.log('Transcript Language:', result.transcript.language);
    console.log('Duration:', result.transcript.duration, 'seconds');
    console.log('\nInsights:');
    console.log(formatInsightsForDisplay(result.insights));
  }
}

// ===========================================
// 4. SEMANTIC SEARCH USAGE
// ===========================================

async function searchExample() {
  const { search, getSuggestions } = require('./semantic-search');

  // Natural language search
  const results = await search(
    'someone who can help me get into Stanford for MS in Computer Science',
    {
      topK: 5,
      userId: 'user_123'
    }
  );

  console.log('Search Results:');
  results.results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.mentor.name}`);
    console.log(`   ${result.mentor.headline}`);
    console.log(`   Zones: ${result.mentor.zones.join(', ')}`);
    console.log(`   Match Score: ${result.score.toFixed(3)}`);
  });

  // Bengali search
  const bengaliResults = await search(
    'আমার startup এর জন্য business strategy mentor দরকার',
    { topK: 5 }
  );

  console.log('\nBengali Search Results:', bengaliResults.results.length);

  // Autocomplete suggestions
  const suggestions = await getSuggestions('career men', 5);
  console.log('\nAutocomplete Suggestions:', suggestions);
}

// ===========================================
// 5. COST TRACKING USAGE
// ===========================================

async function costTrackingExample() {
  const { getStats, getCostBreakdown } = require('./cost-tracker');

  // Get current costs
  const stats = await getStats();
  console.log('\n=== AI Cost Statistics ===');
  console.log(`Today: $${stats.today.toFixed(2)} / $${stats.dailyBudget}`);
  console.log(`Month: $${stats.month.toFixed(2)} / $${stats.monthlyBudget}`);
  console.log(`Daily Utilization: ${stats.utilizationDaily.toFixed(1)}%`);
  console.log(`Remaining Today: $${stats.dailyRemaining.toFixed(2)}`);

  // Get breakdown by service
  const breakdown = await getCostBreakdown();
  console.log('\n=== Cost Breakdown ===');
  for (const [service, data] of Object.entries(breakdown)) {
    console.log(`${service}:`);
    console.log(`  Calls: ${data.count}`);
    console.log(`  Total: $${data.totalCost.toFixed(2)}`);
    console.log(`  Avg: $${data.avgCost.toFixed(4)}`);
  }
}

// ===========================================
// 6. COMPLETE WORKFLOW EXAMPLE
// ===========================================

async function completeWorkflowExample() {
  console.log('=== TrueTalk AI Complete Workflow ===\n');

  // 1. User asks chatbot
  console.log('1. User asks chatbot for help...');
  const { TrueTalkChatbot } = require('./chatbot');
  const chatbot = new TrueTalkChatbot();
  
  const chatResponse = await chatbot.chat([
    { role: 'user', content: 'I need a mentor to help me prepare for product management interviews' }
  ], { userId: 'user_001' });
  
  console.log('Chatbot:', chatResponse.message.substring(0, 100) + '...\n');

  // 2. User searches for mentors
  console.log('2. User searches for mentors...');
  const { search } = require('./semantic-search');
  
  const searchResults = await search(
    'product management interview preparation mentor',
    { topK: 3, userId: 'user_001' }
  );
  
  console.log(`Found ${searchResults.results.length} mentors\n`);

  // 3. AI recommends best matches
  console.log('3. AI finds best matches...');
  const { findMatches } = require('./matching');
  
  const matches = await findMatches({
    goal: 'Prepare for PM interviews',
    zone: 'Career',
    experienceLevel: 'Mid-level',
    preferredLanguage: 'en',
    budget: 200
  }, { topK: 3, includeExplanation: true });
  
  console.log(`Top match: ${matches[0].mentor.name}`);
  console.log(`Explanation: ${matches[0].explanation}\n`);

  // 4. Session completes
  console.log('4. Session completes, processing transcript...');
  const { SessionIntelligence } = require('./session-intelligence');
  const intelligence = new SessionIntelligence();
  
  console.log('(In production, this would transcribe and analyze the session)\n');

  // 5. Check costs
  console.log('5. Checking AI costs...');
  const { getStats } = require('./cost-tracker');
  const stats = await getStats();
  console.log(`Total spent today: $${stats.today.toFixed(2)}`);
  console.log(`Remaining budget: $${stats.dailyRemaining.toFixed(2)}\n`);

  console.log('=== Workflow Complete ===');
}

// ===========================================
// RUN EXAMPLES
// ===========================================

async function runAllExamples() {
  try {
    console.log('\n========================================');
    console.log('TrueTalk AI - Usage Examples');
    console.log('========================================\n');

    // Uncomment the examples you want to run:
    
    // await chatbotExample();
    // await matchingExample();
    // await sessionIntelligenceExample();
    // await searchExample();
    // await costTrackingExample();
    await completeWorkflowExample();

  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

module.exports = {
  chatbotExample,
  matchingExample,
  sessionIntelligenceExample,
  searchExample,
  costTrackingExample,
  completeWorkflowExample,
};
