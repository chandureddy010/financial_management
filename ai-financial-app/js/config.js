// Application Configuration
const CONFIG = {
    // App Info
    APP_NAME: 'AI Financial Manager',
    VERSION: '1.0.0',
    
    // Storage Keys
    STORAGE_KEYS: {
        CURRENT_USER: 'currentUser',
        USERS: 'users',
        TRANSACTIONS: 'transactions',
        CATEGORIES: 'categories',
        BUDGETS: 'budgets',
        SETTINGS: 'settings',
        AI_CONVERSATIONS: 'aiConversations'
    },
    
    // Default Categories
    DEFAULT_CATEGORIES: [
        { id: 'food', name: 'Food & Dining', icon: 'fas fa-utensils', color: '#ef4444' },
        { id: 'transport', name: 'Transportation', icon: 'fas fa-car', color: '#3b82f6' },
        { id: 'shopping', name: 'Shopping', icon: 'fas fa-shopping-cart', color: '#10b981' },
        { id: 'entertainment', name: 'Entertainment', icon: 'fas fa-film', color: '#f59e0b' },
        { id: 'utilities', name: 'Utilities', icon: 'fas fa-lightbulb', color: '#8b5cf6' },
        { id: 'healthcare', name: 'Healthcare', icon: 'fas fa-heartbeat', color: '#ec4899' },
        { id: 'education', name: 'Education', icon: 'fas fa-graduation-cap', color: '#06b6d4' },
        { id: 'travel', name: 'Travel', icon: 'fas fa-plane', color: '#84cc16' },
        { id: 'subscriptions', name: 'Subscriptions', icon: 'fas fa-sync', color: '#f97316' },
        { id: 'others', name: 'Others', icon: 'fas fa-ellipsis-h', color: '#6b7280' }
    ],
    
    // Validation Rules
    VALIDATION: {
        PASSWORD_MIN_LENGTH: 8,
        NAME_MIN_LENGTH: 2,
        PHONE_PATTERN: /^\+?\d{10,15}$/,
        EMAIL_PATTERN: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        WALLET_ADDRESS_PATTERN: /^0x[a-fA-F0-9]{40}$/
    },
    
    // OTP Configuration
    OTP: {
        LENGTH: 6,
        EXPIRY_MINUTES: 10,
        RESEND_COOLDOWN: 60 // seconds
    },
    
    // API Configuration
    API: {
        GROQ_BASE_URL: 'https://api.groq.com/openai/v1/chat/completions',
        GROQ_MODEL: 'mixtral-8x7b-32768'
    },
    
    // Chart Configuration
    CHART_COLORS: [
        '#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6b7280'
    ],
    
    // Currency Settings
    CURRENCY: {
        SYMBOL: '$',
        CODE: 'USD',
        LOCALE: 'en-US'
    },
    
    // Routes
    ROUTES: {
        DASHBOARD: 'dashboard.html',
        SIGNIN: 'signin.html',
        SIGNUP: 'signup.html',
        FORGOT_PASSWORD: 'forgot-password.html',
        USER_DATA: 'user-data.html',
        TRANSACTIONS: 'transactions.html',
        AI_ADVICE: 'ai-advice.html',
        SETTINGS: 'settings.html'
    }
};

// Environment Variables (simulated)
const ENV = {
    GROQ_API_KEY: localStorage.getItem('GROQ_API_KEY') || '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',
    DEVELOPMENT: true
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, ENV };
}