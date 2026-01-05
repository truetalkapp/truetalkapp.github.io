/**
 * TrueTalk AI Frontend Integration
 * Connects your website to the AI backend
 */

// Configuration
const AI_CONFIG = {
  apiUrl: window.location.hostname === 'localhost' 
    ? 'http://localhost:3000' 
    : window.location.origin, // Auto-detect production URL
  userId: null, // Will be set from user session
  language: 'en' // 'en' or 'bn'
};

// ==========================================
// 1. AI CHATBOT WIDGET
// ==========================================

class TrueTalkChatWidget {
  constructor() {
    this.isOpen = false;
    this.conversationHistory = [];
    this.init();
  }

  init() {
    this.createWidget();
    this.attachEventListeners();
  }

  createWidget() {
    const widgetHTML = `
      <!-- Chat Widget -->
      <div id="ai-chat-widget" class="fixed bottom-6 right-6 z-50">
        <!-- Chat Button -->
        <button id="chat-toggle-btn" 
                class="bg-[#ff5100] hover:bg-[#ff6520] text-white rounded-full p-4 shadow-2xl transition-all hover:scale-110"
                aria-label="Open AI Chat">
          <i class="fas fa-comments text-2xl"></i>
        </button>

        <!-- Chat Window -->
        <div id="chat-window" 
             class="hidden absolute bottom-20 right-0 w-96 h-[500px] bg-[#0a0a0a] border border-[#ff5100]/30 rounded-2xl shadow-2xl flex flex-col">
          
          <!-- Header -->
          <div class="bg-gradient-to-r from-[#ff5100] to-[#ff6520] p-4 rounded-t-2xl flex justify-between items-center">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <i class="fas fa-robot text-white"></i>
              </div>
              <div>
                <h3 class="font-bold text-white">TrueTalk AI</h3>
                <p class="text-xs text-white/80">Ask me anything</p>
              </div>
            </div>
            <button id="chat-close-btn" class="text-white hover:text-white/70 transition-colors">
              <i class="fas fa-times text-xl"></i>
            </button>
          </div>

          <!-- Messages Container -->
          <div id="chat-messages" class="flex-1 overflow-y-auto p-4 space-y-3">
            <!-- Welcome message -->
            <div class="flex gap-2">
              <div class="w-8 h-8 bg-[#ff5100] rounded-full flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white text-sm"></i>
              </div>
              <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl rounded-tl-none p-3 max-w-[80%]">
                <p class="text-white text-sm">Hi! 👋 I'm TrueTalk's AI assistant. I can help you find mentors, explain pricing, or answer any questions. How can I help you today?</p>
              </div>
            </div>
          </div>

          <!-- Input Area -->
          <div class="p-4 border-t border-white/10">
            <div class="flex gap-2">
              <input type="text" 
                     id="chat-input" 
                     placeholder="Ask me anything..."
                     class="flex-1 bg-[#1a1a1a] border border-white/10 rounded-full px-4 py-2 text-white text-sm focus:outline-none focus:border-[#ff5100]">
              <button id="chat-send-btn" 
                      class="bg-[#ff5100] hover:bg-[#ff6520] text-white rounded-full px-5 py-2 transition-colors">
                <i class="fas fa-paper-plane"></i>
              </button>
            </div>
            <p class="text-xs text-gray-500 mt-2 text-center">Powered by Groq (FREE) • Supports Bengali</p>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', widgetHTML);
  }

  attachEventListeners() {
    const toggleBtn = document.getElementById('chat-toggle-btn');
    const closeBtn = document.getElementById('chat-close-btn');
    const sendBtn = document.getElementById('chat-send-btn');
    const input = document.getElementById('chat-input');

    toggleBtn.addEventListener('click', () => this.toggleChat());
    closeBtn.addEventListener('click', () => this.toggleChat());
    sendBtn.addEventListener('click', () => this.sendMessage());
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  }

  toggleChat() {
    const chatWindow = document.getElementById('chat-window');
    this.isOpen = !this.isOpen;
    
    if (this.isOpen) {
      chatWindow.classList.remove('hidden');
      document.getElementById('chat-input').focus();
    } else {
      chatWindow.classList.add('hidden');
    }
  }

  async sendMessage() {
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;

    // Display user message
    this.addMessage(message, 'user');
    input.value = '';

    // Show typing indicator
    const typingId = this.showTypingIndicator();

    try {
      // Send to backend
      const response = await fetch(`${AI_CONFIG.apiUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          userId: AI_CONFIG.userId || 'anonymous',
          language: this.detectLanguage(message),
          history: this.conversationHistory.slice(-4) // Last 4 messages for context
        })
      });

      const data = await response.json();

      // Remove typing indicator
      this.removeTypingIndicator(typingId);

      // Display bot response
      if (data.success) {
        this.addMessage(data.message, 'bot');
        
        // Update conversation history
        this.conversationHistory.push(
          { role: 'user', content: message },
          { role: 'assistant', content: data.message }
        );
      } else {
        this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.removeTypingIndicator(typingId);
      this.addMessage('Could not connect to AI service. Please check if the backend server is running.', 'bot');
    }
  }

  addMessage(text, sender) {
    const messagesContainer = document.getElementById('chat-messages');
    const isBot = sender === 'bot';

    const messageHTML = `
      <div class="flex gap-2 ${isBot ? '' : 'flex-row-reverse'}">
        ${isBot ? `
          <div class="w-8 h-8 bg-[#ff5100] rounded-full flex items-center justify-center flex-shrink-0">
            <i class="fas fa-robot text-white text-sm"></i>
          </div>
        ` : ''}
        <div class="bg-${isBot ? '[#1a1a1a] border border-white/10' : '[#ff5100]'} rounded-2xl ${isBot ? 'rounded-tl-none' : 'rounded-tr-none'} p-3 max-w-[80%]">
          <p class="text-white text-sm">${this.formatMessage(text)}</p>
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  showTypingIndicator() {
    const messagesContainer = document.getElementById('chat-messages');
    const typingId = 'typing-' + Date.now();
    
    const typingHTML = `
      <div id="${typingId}" class="flex gap-2">
        <div class="w-8 h-8 bg-[#ff5100] rounded-full flex items-center justify-center flex-shrink-0">
          <i class="fas fa-robot text-white text-sm"></i>
        </div>
        <div class="bg-[#1a1a1a] border border-white/10 rounded-2xl rounded-tl-none p-3">
          <div class="flex gap-1">
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0s"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
            <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0.4s"></div>
          </div>
        </div>
      </div>
    `;

    messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return typingId;
  }

  removeTypingIndicator(typingId) {
    const indicator = document.getElementById(typingId);
    if (indicator) indicator.remove();
  }

  formatMessage(text) {
    // Convert URLs to links
    return text.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" class="underline">$1</a>');
  }

  detectLanguage(text) {
    // Simple Bengali detection
    const bengaliPattern = /[\u0980-\u09FF]/;
    return bengaliPattern.test(text) ? 'bn' : 'en';
  }
}

// ==========================================
// 2. SEMANTIC SEARCH ENHANCEMENT
// ==========================================

class AISearch {
  constructor() {
    this.debounceTimer = null;
  }

  async search(query) {
    try {
      const response = await fetch(`${AI_CONFIG.apiUrl}/api/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          topK: 10,
          userId: AI_CONFIG.userId
        })
      });

      const data = await response.json();
      return data.results || [];
    } catch (error) {
      console.error('Search error:', error);
      return [];
    }
  }

  async getSuggestions(partialQuery) {
    try {
      const response = await fetch(`${AI_CONFIG.apiUrl}/api/suggestions?q=${encodeURIComponent(partialQuery)}&limit=5`);
      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }

  // Debounced autocomplete
  autocomplete(input, callback) {
    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(async () => {
      if (input.length >= 3) {
        const suggestions = await this.getSuggestions(input);
        callback(suggestions);
      }
    }, 300);
  }
}

// ==========================================
// 3. MENTOR MATCHING
// ==========================================

class AIMatching {
  async findMatches(userProfile) {
    try {
      const response = await fetch(`${AI_CONFIG.apiUrl}/api/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: AI_CONFIG.userId,
          ...userProfile
        })
      });

      const data = await response.json();
      return data.matches || [];
    } catch (error) {
      console.error('Matching error:', error);
      return [];
    }
  }
}

// ==========================================
// 4. INITIALIZE ON PAGE LOAD
// ==========================================

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAI);
} else {
  initializeAI();
}

function initializeAI() {
  // Initialize chat widget
  window.trueTalkChat = new TrueTalkChatWidget();
  window.trueTalkSearch = new AISearch();
  window.trueTalkMatching = new AIMatching();

  console.log('✅ TrueTalk AI initialized');
  console.log('   Chat widget: Ready');
  console.log('   Semantic search: Ready');
  console.log('   Mentor matching: Ready');
}

// ==========================================
// 5. EXPORT FOR USE IN OTHER SCRIPTS
// ==========================================

window.TrueTalkAI = {
  chat: () => window.trueTalkChat,
  search: () => window.trueTalkSearch,
  matching: () => window.trueTalkMatching,
  config: AI_CONFIG
};
