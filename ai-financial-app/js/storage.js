// Storage Management System

class StorageManager {
    constructor() {
        this.initializeDefaultData();
    }
    
    // Initialize default data structure
    initializeDefaultData() {
        // Initialize users if not exists
        if (!this.get(CONFIG.STORAGE_KEYS.USERS)) {
            this.set(CONFIG.STORAGE_KEYS.USERS, []);
        }
        
        // Initialize categories if not exists
        if (!this.get(CONFIG.STORAGE_KEYS.CATEGORIES)) {
            this.set(CONFIG.STORAGE_KEYS.CATEGORIES, CONFIG.DEFAULT_CATEGORIES);
        }
        
        // Initialize other data structures
        const defaultStructures = {
            [CONFIG.STORAGE_KEYS.TRANSACTIONS]: [],
            [CONFIG.STORAGE_KEYS.BUDGETS]: [],
            [CONFIG.STORAGE_KEYS.AI_CONVERSATIONS]: []
        };
        
        for (let key in defaultStructures) {
            if (!this.get(key)) {
                this.set(key, defaultStructures[key]);
            }
        }
    }
    
    // Generic storage methods
    set(key, value) {
        try {
            const data = JSON.stringify(value);
            localStorage.setItem(key, data);
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    }
    
    get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    }
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    }
    
    // User management
    createUser(userData) {
        const users = this.get(CONFIG.STORAGE_KEYS.USERS) || [];
        const newUser = {
            id: StringUtils.generateUUID(),
            ...userData,
            createdAt: DateUtils.now(),
            updatedAt: DateUtils.now()
        };
        
        users.push(newUser);
        this.set(CONFIG.STORAGE_KEYS.USERS, users);
        return newUser;
    }
    
    getUserByEmail(email) {
        const users = this.get(CONFIG.STORAGE_KEYS.USERS) || [];
        return users.find(user => user.email === email);
    }
    
    getUserByWallet(walletAddress) {
        const users = this.get(CONFIG.STORAGE_KEYS.USERS) || [];
        return users.find(user => user.walletAddress === walletAddress);
    }
    
    updateUser(userId, updateData) {
        const users = this.get(CONFIG.STORAGE_KEYS.USERS) || [];
        const userIndex = users.findIndex(user => user.id === userId);
        
        if (userIndex !== -1) {
            users[userIndex] = {
                ...users[userIndex],
                ...updateData,
                updatedAt: DateUtils.now()
            };
            this.set(CONFIG.STORAGE_KEYS.USERS, users);
            return users[userIndex];
        }
        return null;
    }
    
    // Current user session
    setCurrentUser(user) {
        this.set(CONFIG.STORAGE_KEYS.CURRENT_USER, user);
    }
    
    getCurrentUser() {
        return this.get(CONFIG.STORAGE_KEYS.CURRENT_USER);
    }
    
    clearCurrentUser() {
        this.remove(CONFIG.STORAGE_KEYS.CURRENT_USER);
    }
    
    // Transaction management
    createTransaction(transactionData) {
        const transactions = this.get(CONFIG.STORAGE_KEYS.TRANSACTIONS) || [];
        const newTransaction = {
            id: StringUtils.generateUUID(),
            ...transactionData,
            createdAt: DateUtils.now(),
            updatedAt: DateUtils.now()
        };
        
        transactions.push(newTransaction);
        this.set(CONFIG.STORAGE_KEYS.TRANSACTIONS, transactions);
        return newTransaction;
    }
    
    getUserTransactions(userId) {
        const transactions = this.get(CONFIG.STORAGE_KEYS.TRANSACTIONS) || [];
        return transactions.filter(transaction => transaction.userId === userId);
    }
    
    updateTransaction(transactionId, updateData) {
        const transactions = this.get(CONFIG.STORAGE_KEYS.TRANSACTIONS) || [];
        const transactionIndex = transactions.findIndex(t => t.id === transactionId);
        
        if (transactionIndex !== -1) {
            transactions[transactionIndex] = {
                ...transactions[transactionIndex],
                ...updateData,
                updatedAt: DateUtils.now()
            };
            this.set(CONFIG.STORAGE_KEYS.TRANSACTIONS, transactions);
            return transactions[transactionIndex];
        }
        return null;
    }
    
    deleteTransaction(transactionId) {
        const transactions = this.get(CONFIG.STORAGE_KEYS.TRANSACTIONS) || [];
        const filteredTransactions = transactions.filter(t => t.id !== transactionId);
        this.set(CONFIG.STORAGE_KEYS.TRANSACTIONS, filteredTransactions);
        return true;
    }
    
    // Budget management
    createBudget(budgetData) {
        const budgets = this.get(CONFIG.STORAGE_KEYS.BUDGETS) || [];
        const newBudget = {
            id: StringUtils.generateUUID(),
            ...budgetData,
            createdAt: DateUtils.now(),
            updatedAt: DateUtils.now()
        };
        
        budgets.push(newBudget);
        this.set(CONFIG.STORAGE_KEYS.BUDGETS, budgets);
        return newBudget;
    }
    
    getUserBudgets(userId) {
        const budgets = this.get(CONFIG.STORAGE_KEYS.BUDGETS) || [];
        return budgets.filter(budget => budget.userId === userId);
    }
    
    updateBudget(budgetId, updateData) {
        const budgets = this.get(CONFIG.STORAGE_KEYS.BUDGETS) || [];
        const budgetIndex = budgets.findIndex(b => b.id === budgetId);
        
        if (budgetIndex !== -1) {
            budgets[budgetIndex] = {
                ...budgets[budgetIndex],
                ...updateData,
                updatedAt: DateUtils.now()
            };
            this.set(CONFIG.STORAGE_KEYS.BUDGETS, budgets);
            return budgets[budgetIndex];
        }
        return null;
    }
    
    // Category management
    getCategories() {
        return this.get(CONFIG.STORAGE_KEYS.CATEGORIES) || CONFIG.DEFAULT_CATEGORIES;
    }
    
    createCategory(categoryData) {
        const categories = this.getCategories();
        const newCategory = {
            id: StringUtils.generateUUID(),
            ...categoryData,
            createdAt: DateUtils.now()
        };
        
        categories.push(newCategory);
        this.set(CONFIG.STORAGE_KEYS.CATEGORIES, categories);
        return newCategory;
    }
    
    // AI conversation management
    saveAIConversation(userId, conversation) {
        const conversations = this.get(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS) || [];
        const newConversation = {
            id: StringUtils.generateUUID(),
            userId,
            ...conversation,
            createdAt: DateUtils.now()
        };
        
        conversations.push(newConversation);
        this.set(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS, conversations);
        return newConversation;
    }
    
    getUserConversations(userId) {
        const conversations = this.get(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS) || [];
        return conversations.filter(conv => conv.userId === userId);
    }
    
    // OTP management
    saveOTP(email, otp) {
        const otps = this.get('otps') || {};
        otps[email] = {
            code: otp,
            createdAt: DateUtils.now(),
            expiresAt: DateUtils.now() + (CONFIG.OTP.EXPIRY_MINUTES * 60 * 1000)
        };
        this.set('otps', otps);
    }
    
    getOTP(email) {
        const otps = this.get('otps') || {};
        return otps[email];
    }
    
    removeOTP(email) {
        const otps = this.get('otps') || {};
        delete otps[email];
        this.set('otps', otps);
    }
    
    // Data export/import
    exportData() {
        const data = {
            users: this.get(CONFIG.STORAGE_KEYS.USERS),
            transactions: this.get(CONFIG.STORAGE_KEYS.TRANSACTIONS),
            budgets: this.get(CONFIG.STORAGE_KEYS.BUDGETS),
            categories: this.get(CONFIG.STORAGE_KEYS.CATEGORIES),
            conversations: this.get(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS),
            exportDate: DateUtils.now()
        };
        return data;
    }
    
    importData(data) {
        try {
            this.set(CONFIG.STORAGE_KEYS.USERS, data.users || []);
            this.set(CONFIG.STORAGE_KEYS.TRANSACTIONS, data.transactions || []);
            this.set(CONFIG.STORAGE_KEYS.BUDGETS, data.budgets || []);
            this.set(CONFIG.STORAGE_KEYS.CATEGORIES, data.categories || CONFIG.DEFAULT_CATEGORIES);
            this.set(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS, data.conversations || []);
            return true;
        } catch (error) {
            console.error('Data import error:', error);
            return false;
        }
    }
    
    // Clear all data
    clearAllData() {
        const keys = Object.values(CONFIG.STORAGE_KEYS);
        keys.forEach(key => this.remove(key));
        this.remove('otps');
        this.initializeDefaultData();
    }
}

// Create global storage instance
const Storage = new StorageManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManager, Storage };
}