/**
 * Quick test script to verify Groq integration
 * Run with: node test-chat.js
 */

const { TrueTalkChatbot } = require('./ai/index');

async function testChat() {
  console.log('🧪 Testing TrueTalk Chatbot with Groq...\n');

  try {
    const chatbot = new TrueTalkChatbot();
    
    console.log('📤 Sending test message: "Hello, can you help me find a mentor?"\n');
    
    const response = await chatbot.chat([
      { role: 'user', content: 'Hello, can you help me find a mentor?' }
    ], {
      userId: 'test_user',
      language: 'en'
    });

    console.log('✅ SUCCESS! Response received:\n');
    console.log('Message:', response.message);
    console.log('\n📊 Details:');
    console.log('- Cost: $' + response.cost, '(Should be $0 with Groq)');
    console.log('- Cached:', response.cached);
    console.log('- Latency:', response.latency + 'ms');
    console.log('\n🎉 Groq integration is working perfectly!');
    
    // Test Bengali
    console.log('\n\n🧪 Testing Bengali support...\n');
    console.log('📤 Sending: "আমি কিভাবে mentor খুঁজবো?"\n');
    
    const bengaliResponse = await chatbot.chat([
      { role: 'user', content: 'আমি কিভাবে mentor খুঁজবো?' }
    ], {
      userId: 'test_user',
      language: 'bn'
    });

    console.log('✅ Bengali response received:\n');
    console.log(bengaliResponse.message);
    console.log('\n🇧🇩 Bengali support working!');

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('1. Make sure you ran: npm install');
    console.error('2. Check .env.ai has your Groq API key');
    console.error('3. Verify LLM_PROVIDER=groq in .env.ai');
    console.error('4. Get Groq key from: https://console.groq.com/');
  }
}

testChat();
