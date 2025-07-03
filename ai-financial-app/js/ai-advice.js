// AI Advisor System

class AIAdvisorManager {
    constructor() {
        this.currentUser = null;
        this.transactions = [];
        this.categories = [];
        this.budgets = [];
        this.chatHistory = [];
        this.isTyping = false;
        this.currentAnalysis = 'spending';
        this.aiSettings = {
            responseStyle: 'detailed',
            focusAreas: {
                budgeting: true,
                investments: true,
                savings: true,
                debt: true
            },
            riskTolerance: 5
        };
        this.init();
    }
    
    init() {
        // Check authentication
        if (!Auth.requireAuth()) return;
        
        this.currentUser = Auth.getCurrentUser();
        this.loadData();
        this.setupEventListeners();
        this.renderAIAdvisor();
    }
    
    loadData() {
        this.transactions = Storage.getUserTransactions(this.currentUser.id);
        this.categories = Storage.getCategories();
        this.budgets = Storage.getUserBudgets(this.currentUser.id);
        this.chatHistory = Storage.getUserConversations(this.currentUser.id);
        
        // Load AI settings
        const savedSettings = Storage.get(`aiSettings_${this.currentUser.id}`);
        if (savedSettings) {
            this.aiSettings = { ...this.aiSettings, ...savedSettings };
        }
    }
    
    setupEventListeners() {
        // Chat form
        const chatForm = DOM.get('chatForm');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleChatSubmit();
            });
        }
        
        // Chat input
        const chatInput = DOM.get('chatInput');
        if (chatInput) {
            chatInput.addEventListener('input', (e) => {
                this.updateCharCount(e.target.value.length);
                this.toggleSendButton(e.target.value.trim().length > 0);
            });
            
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleChatSubmit();
                }
            });
        }
        
        // Analysis type change
        const analysisType = DOM.get('analysisType');
        if (analysisType) {
            analysisType.addEventListener('change', (e) => {
                this.currentAnalysis = e.target.value;
                this.updateAnalysis();
            });
        }
        
        // AI Settings form
        const aiSettingsForm = DOM.get('aiSettingsForm');
        if (aiSettingsForm) {
            aiSettingsForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveAISettings();
            });
        }
    }
    
    renderAIAdvisor() {
        this.renderUserInfo();
        this.renderInsights();
        this.renderChatHistory();
        this.renderAnalysis();
        this.renderRecommendations();
        this.loadAISettings();
    }
    
    renderUserInfo() {
        const userName = DOM.get('userName');
        const userEmail = DOM.get('userEmail');
        
        if (userName) {
            DOM.setText(userName, this.currentUser.fullName);
        }
        
        if (userEmail) {
            DOM.setText(userEmail, this.currentUser.email);
        }
    }
    
    renderInsights() {
        const insightsGrid = DOM.get('insightsGrid');
        if (!insightsGrid) return;
        
        const insights = this.generateInsights();
        
        if (insights.length === 0) {
            insightsGrid.innerHTML = `
                <div class="loading-insight">
                    <i class="fas fa-robot"></i>
                    Analyzing your financial data...
                </div>
            `;
            return;
        }
        
        const insightsHTML = insights.map(insight => `
            <div class="insight-card ${insight.type}">
                <div class="insight-header">
                    <div class="insight-icon">
                        <i class="${insight.icon}"></i>
                    </div>
                    <h4 class="insight-title">${insight.title}</h4>
                </div>
                <p class="insight-description">${insight.description}</p>
                ${insight.metrics ? `
                    <div class="insight-metrics">
                        ${insight.metrics.map(metric => `
                            <div class="metric">
                                <div class="metric-value">${metric.value}</div>
                                <div class="metric-label">${metric.label}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        insightsGrid.innerHTML = insightsHTML;
    }
    
    generateInsights() {
        const insights = [];
        
        if (this.transactions.length === 0) {
            insights.push({
                type: 'info',
                icon: 'fas fa-info-circle',
                title: 'Get Started',
                description: 'Add some transactions to receive personalized AI insights about your spending patterns and financial health.'
            });
            return insights;
        }
        
        // Spending pattern insight
        const spendingInsight = this.analyzeSpendingPatterns();
        if (spendingInsight) insights.push(spendingInsight);
        
        // Budget status insight
        const budgetInsight = this.analyzeBudgetStatus();
        if (budgetInsight) insights.push(budgetInsight);
        
        // Savings opportunity insight
        const savingsInsight = this.analyzeSavingsOpportunities();
        if (savingsInsight) insights.push(savingsInsight);
        
        // Cash flow insight
        const cashFlowInsight = this.analyzeCashFlow();
        if (cashFlowInsight) insights.push(cashFlowInsight);
        
        return insights;
    }
    
    analyzeSpendingPatterns() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const expenses = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return t.type === 'expense' && transDate >= startOfMonth;
        });
        
        if (expenses.length === 0) return null;
        
        // Find top spending category
        const categoryTotals = {};
        expenses.forEach(expense => {
            const category = this.categories.find(cat => cat.id === expense.categoryId);
            const categoryName = category?.name || 'Others';
            categoryTotals[categoryName] = (categoryTotals[categoryName] || 0) + expense.amount;
        });
        
        const topCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => b - a)[0];
        const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
        const avgTransaction = totalSpent / expenses.length;
        
        return {
            type: 'info',
            icon: 'fas fa-chart-pie',
            title: 'Spending Pattern Analysis',
            description: `Your top spending category this month is ${topCategory[0]}, accounting for ${Math.round((topCategory[1] / totalSpent) * 100)}% of your expenses.`,
            metrics: [
                { value: NumberUtils.formatCurrency(totalSpent), label: 'Total Spent' },
                { value: NumberUtils.formatCurrency(avgTransaction), label: 'Avg Transaction' },
                { value: expenses.length.toString(), label: 'Transactions' }
            ]
        };
    }
    
    analyzeBudgetStatus() {
        if (this.budgets.length === 0) {
            return {
                type: 'warning',
                icon: 'fas fa-exclamation-triangle',
                title: 'No Budget Set',
                description: 'Setting up a budget can help you manage your expenses better and achieve your financial goals.'
            };
        }
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        let totalBudget = 0;
        let totalSpent = 0;
        let overBudgetCategories = 0;
        
        this.budgets.forEach(budget => {
            totalBudget += budget.amount;
            const spent = this.transactions
                .filter(t => {
                    const transDate = new Date(t.date);
                    return t.type === 'expense' && 
                           t.categoryId === budget.categoryId && 
                           transDate >= startOfMonth && 
                           transDate <= endOfMonth;
                })
                .reduce((sum, t) => sum + t.amount, 0);
            
            totalSpent += spent;
            if (spent > budget.amount) {
                overBudgetCategories++;
            }
        });
        
        const budgetUsage = (totalSpent / totalBudget) * 100;
        
        let type = 'success';
        let title = 'Budget On Track';
        let description = `You've used ${budgetUsage.toFixed(1)}% of your monthly budget. Great job staying on track!`;
        
        if (budgetUsage > 100) {
            type = 'danger';
            title = 'Over Budget';
            description = `You've exceeded your monthly budget by ${(budgetUsage - 100).toFixed(1)}%. Consider reviewing your spending.`;
        } else if (budgetUsage > 80) {
            type = 'warning';
            title = 'Near Budget Limit';
            description = `You've used ${budgetUsage.toFixed(1)}% of your monthly budget. Watch your spending for the rest of the month.`;
        }
        
        return {
            type: type,
            icon: 'fas fa-chart-bar',
            title: title,
            description: description,
            metrics: [
                { value: NumberUtils.formatCurrency(totalSpent), label: 'Spent' },
                { value: NumberUtils.formatCurrency(totalBudget), label: 'Budget' },
                { value: `${budgetUsage.toFixed(1)}%`, label: 'Usage' }
            ]
        };
    }
    
    analyzeSavingsOpportunities() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const monthlyIncome = this.transactions
            .filter(t => {
                const transDate = new Date(t.date);
                return t.type === 'income' && transDate >= startOfMonth && transDate <= endOfMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthlyExpenses = this.transactions
            .filter(t => {
                const transDate = new Date(t.date);
                return t.type === 'expense' && transDate >= startOfMonth && transDate <= endOfMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        const savings = monthlyIncome - monthlyExpenses;
        const savingsRate = monthlyIncome > 0 ? (savings / monthlyIncome) * 100 : 0;
        
        let type = 'success';
        let title = 'Great Savings Rate!';
        let description = `You're saving ${savingsRate.toFixed(1)}% of your income this month. Keep up the excellent work!`;
        
        if (savingsRate < 0) {
            type = 'danger';
            title = 'Spending More Than Earning';
            description = 'Your expenses exceed your income this month. Consider reducing discretionary spending.';
        } else if (savingsRate < 10) {
            type = 'warning';
            title = 'Low Savings Rate';
            description = `You're only saving ${savingsRate.toFixed(1)}% of your income. Aim for at least 20% to build financial security.`;
        } else if (savingsRate < 20) {
            type = 'info';
            title = 'Good Savings Progress';
            description = `You're saving ${savingsRate.toFixed(1)}% of your income. Consider increasing to 20% or more for optimal financial health.`;
        }
        
        return {
            type: type,
            icon: 'fas fa-piggy-bank',
            title: title,
            description: description,
            metrics: [
                { value: NumberUtils.formatCurrency(savings), label: 'Monthly Savings' },
                { value: `${savingsRate.toFixed(1)}%`, label: 'Savings Rate' },
                { value: NumberUtils.formatCurrency(monthlyIncome), label: 'Income' }
            ]
        };
    }
    
    analyzeCashFlow() {
        // Analyze last 3 months of cash flow
        const now = new Date();
        const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
        
        const recentTransactions = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= threeMonthsAgo;
        });
        
        const monthlyData = {};
        recentTransactions.forEach(transaction => {
            const month = new Date(transaction.date).toISOString().slice(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0 };
            }
            if (transaction.type === 'income') {
                monthlyData[month].income += transaction.amount;
            } else {
                monthlyData[month].expenses += transaction.amount;
            }
        });
        
        const months = Object.keys(monthlyData).sort();
        if (months.length < 2) return null;
        
        const latestMonth = monthlyData[months[months.length - 1]];
        const previousMonth = monthlyData[months[months.length - 2]];
        
        const incomeChange = previousMonth.income > 0 ? 
            ((latestMonth.income - previousMonth.income) / previousMonth.income) * 100 : 0;
        
        const expenseChange = previousMonth.expenses > 0 ?
            ((latestMonth.expenses - previousMonth.expenses) / previousMonth.expenses) * 100 : 0;
        
        let type = 'info';
        let title = 'Cash Flow Analysis';
        let description = `Your income changed by ${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}% and expenses by ${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}% compared to last month.`;
        
        if (incomeChange > 0 && expenseChange < 0) {
            type = 'success';
            title = 'Excellent Cash Flow';
            description = 'Your income increased while expenses decreased. Perfect financial momentum!';
        } else if (incomeChange < 0 && expenseChange > 0) {
            type = 'warning';
            title = 'Cash Flow Concern';
            description = 'Your income decreased while expenses increased. Consider reviewing your budget.';
        }
        
        return {
            type: type,
            icon: 'fas fa-exchange-alt',
            title: title,
            description: description,
            metrics: [
                { value: `${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}%`, label: 'Income Change' },
                { value: `${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}%`, label: 'Expense Change' },
                { value: NumberUtils.formatCurrency(latestMonth.income - latestMonth.expenses), label: 'Net Flow' }
            ]
        };
    }
    
    renderChatHistory() {
        const chatMessages = DOM.get('chatMessages');
        if (!chatMessages) return;
        
        // Clear existing messages except welcome message
        const welcomeMessage = chatMessages.querySelector('.message.ai-message');
        chatMessages.innerHTML = '';
        if (welcomeMessage) {
            chatMessages.appendChild(welcomeMessage);
        }
        
        // Render chat history
        this.chatHistory.forEach(conversation => {
            if (conversation.userMessage) {
                this.addMessageToChat(conversation.userMessage, 'user');
            }
            if (conversation.aiResponse) {
                this.addMessageToChat(conversation.aiResponse, 'ai');
            }
        });
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    addMessageToChat(message, sender) {
        const chatMessages = DOM.get('chatMessages');
        if (!chatMessages) return;
        
        const messageElement = document.createElement('div');
        messageElement.className = `message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
        
        messageElement.innerHTML = `
            <div class="message-avatar">
                <i class="${sender === 'user' ? 'fas fa-user' : 'fas fa-robot'}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${this.formatMessage(message)}
                </div>
                <div class="message-timestamp">${DateUtils.getRelativeTime(new Date())}</div>
            </div>
        `;
        
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    formatMessage(message) {
        // Convert markdown-like formatting to HTML
        return message
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/\n/g, '<br>')
            .replace(/•\s/g, '<li>')
            .replace(/(\<li\>.*?)(?=\<li\>|$)/gs, '<ul>$1</ul>')
            .replace(/\<li\>/g, '<li>')
            .replace(/\<\/ul\>\<ul\>/g, '');
    }
    
    showTypingIndicator() {
        const chatMessages = DOM.get('chatMessages');
        if (!chatMessages) return;
        
        const typingElement = document.createElement('div');
        typingElement.className = 'typing-indicator';
        typingElement.id = 'typing-indicator';
        
        typingElement.innerHTML = `
            <div class="message-avatar">
                <i class="fas fa-robot"></i>
            </div>
            <div class="typing-dots">
                <div class="dot"></div>
                <div class="dot"></div>
                <div class="dot"></div>
            </div>
        `;
        
        chatMessages.appendChild(typingElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    hideTypingIndicator() {
        const typingIndicator = DOM.get('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }
    
    updateCharCount(count) {
        const charCount = DOM.get('charCount');
        if (charCount) {
            charCount.textContent = `${count}/500`;
            charCount.style.color = count > 450 ? 'var(--warning-color)' : 'var(--text-muted)';
        }
    }
    
    toggleSendButton(enabled) {
        const sendBtn = document.querySelector('.send-btn');
        if (sendBtn) {
            sendBtn.disabled = !enabled || this.isTyping;
        }
    }
    
    handleChatSubmit() {
        const chatInput = DOM.get('chatInput');
        if (!chatInput) return;
        
        const message = chatInput.value.trim();
        if (!message || this.isTyping) return;
        
        // Add user message to chat
        this.addMessageToChat(message, 'user');
        
        // Clear input
        chatInput.value = '';
        this.updateCharCount(0);
        this.toggleSendButton(false);
        
        // Process AI response
        this.processAIResponse(message);
    }
    
    async processAIResponse(userMessage) {
        this.isTyping = true;
        this.showTypingIndicator();
        this.updateAIStatus('Thinking...');
        
        try {
            // Generate AI response
            const aiResponse = await this.generateAIResponse(userMessage);
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add AI response to chat
            this.addMessageToChat(aiResponse, 'ai');
            
            // Save conversation
            this.saveConversation(userMessage, aiResponse);
            
        } catch (error) {
            console.error('AI Response Error:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('I apologize, but I encountered an error while processing your request. Please try again.', 'ai');
        } finally {
            this.isTyping = false;
            this.updateAIStatus('Ready to help');
            this.toggleSendButton(false);
        }
    }
    
    async generateAIResponse(userMessage) {
        // Prepare financial context
        const context = this.prepareFinancialContext();
        
        // Create enhanced prompt
        const prompt = this.createAIPrompt(userMessage, context);
        
        try {
            // Call Groq API (if available)
            if (ENV.GROQ_API_KEY && ENV.GROQ_API_KEY !== 'your-groq-api-key-here') {
                return await this.callGroqAPI(prompt);
            } else {
                // Fallback to rule-based responses
                return this.generateRuleBasedResponse(userMessage, context);
            }
        } catch (error) {
            console.error('AI API Error:', error);
            return this.generateRuleBasedResponse(userMessage, context);
        }
    }
    
    prepareFinancialContext() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // Calculate key metrics
        const monthlyIncome = this.transactions
            .filter(t => t.type === 'income' && new Date(t.date) >= startOfMonth)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthlyExpenses = this.transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth)
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalBudget = this.budgets.reduce((sum, b) => sum + b.amount, 0);
        
        // Category breakdown
        const categorySpending = {};
        this.transactions
            .filter(t => t.type === 'expense' && new Date(t.date) >= startOfMonth)
            .forEach(transaction => {
                const category = this.categories.find(cat => cat.id === transaction.categoryId);
                const categoryName = category?.name || 'Others';
                categorySpending[categoryName] = (categorySpending[categoryName] || 0) + transaction.amount;
            });
        
        return {
            monthlyIncome,
            monthlyExpenses,
            totalBudget,
            savingsRate: monthlyIncome > 0 ? ((monthlyIncome - monthlyExpenses) / monthlyIncome) * 100 : 0,
            totalTransactions: this.transactions.length,
            categorySpending,
            budgetCount: this.budgets.length,
            userPreferences: this.currentUser.preferences || {},
            riskTolerance: this.aiSettings.riskTolerance
        };
    }
    
    createAIPrompt(userMessage, context) {
        return `
You are a professional financial advisor AI assistant. Based on the user's financial data and question, provide helpful, accurate, and personalized advice.

User's Financial Context:
- Monthly Income: $${context.monthlyIncome.toFixed(2)}
- Monthly Expenses: $${context.monthlyExpenses.toFixed(2)}
- Monthly Budget: $${context.totalBudget.toFixed(2)}
- Savings Rate: ${context.savingsRate.toFixed(1)}%
- Total Transactions: ${context.totalTransactions}
- Risk Tolerance: ${context.riskTolerance}/10

Category Spending:
${Object.entries(context.categorySpending).map(([cat, amount]) => `- ${cat}: $${amount.toFixed(2)}`).join('\n')}

User Question: "${userMessage}"

Please provide a helpful, concise, and actionable response. Focus on practical advice based on their financial situation.
        `;
    }
    
    async callGroqAPI(prompt) {
        const response = await fetch(CONFIG.API.GROQ_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${ENV.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: CONFIG.API.GROQ_MODEL,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful financial advisor AI assistant. Provide practical, actionable financial advice.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        return data.choices[0].message.content;
    }
    
    generateRuleBasedResponse(userMessage, context) {
        const message = userMessage.toLowerCase();
        
        // Budget-related questions
        if (message.includes('budget') || message.includes('spending')) {
            if (context.totalBudget === 0) {
                return "I notice you don't have any budgets set up yet. Creating a budget is one of the most effective ways to manage your finances. Based on your current spending patterns, I recommend starting with the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings. Would you like help setting up your first budget?";
            }
            
            const budgetUsage = (context.monthlyExpenses / context.totalBudget) * 100;
            if (budgetUsage > 100) {
                return `You're currently ${(budgetUsage - 100).toFixed(1)}% over your monthly budget. I recommend reviewing your ${Object.keys(context.categorySpending)[0]} spending, which appears to be your largest expense category. Consider setting stricter limits and tracking daily expenses more closely.`;
            } else if (budgetUsage > 80) {
                return `You've used ${budgetUsage.toFixed(1)}% of your monthly budget. You're getting close to your limit, so I suggest being more cautious with discretionary spending for the rest of the month. Focus on essential purchases only.`;
            } else {
                return `Great job! You're only using ${budgetUsage.toFixed(1)}% of your monthly budget. This gives you flexibility for unexpected expenses or additional savings. Consider increasing your savings target if you consistently stay under budget.`;
            }
        }
        
        // Savings-related questions
        if (message.includes('save') || message.includes('saving')) {
            if (context.savingsRate < 0) {
                return "I see you're spending more than you're earning this month. This is concerning for your financial health. I recommend immediately reviewing all non-essential expenses and creating an emergency budget. Focus on reducing discretionary spending and consider additional income sources if possible.";
            } else if (context.savingsRate < 10) {
                return `Your current savings rate is ${context.savingsRate.toFixed(1)}%, which is below the recommended 20%. Start by automating your savings - even $50-100 per month can make a difference. Look for small expenses to cut, like subscriptions you don't use or eating out less frequently.`;
            } else if (context.savingsRate >= 20) {
                return `Excellent! Your ${context.savingsRate.toFixed(1)}% savings rate is fantastic. With this strong foundation, consider diversifying your savings into different goals: emergency fund (3-6 months expenses), retirement contributions, and specific goals like vacation or down payment funds.`;
            } else {
                return `Your ${context.savingsRate.toFixed(1)}% savings rate is good, but there's room for improvement. Try to gradually increase it to 20% by reducing your largest expense categories. Small changes like cooking more at home or finding better deals on recurring expenses can help.`;
            }
        }
        
        // Investment questions
        if (message.includes('invest') || message.includes('investment')) {
            if (context.savingsRate < 10) {
                return "Before investing, it's important to have a solid financial foundation. Focus on building an emergency fund (3-6 months of expenses) and improving your savings rate to at least 20%. Once you have that foundation, consider low-cost index funds for long-term growth.";
            } else {
                const riskLevel = context.riskTolerance > 7 ? 'aggressive' : context.riskTolerance > 4 ? 'moderate' : 'conservative';
                return `Based on your ${riskLevel} risk tolerance, I recommend starting with diversified index funds. For ${riskLevel} investors, consider a mix of stock and bond funds appropriate for your age and goals. Start with small, consistent investments and increase as you become more comfortable.`;
            }
        }
        
        // Expense reduction questions
        if (message.includes('reduce') || message.includes('cut') || message.includes('lower')) {
            const topCategory = Object.entries(context.categorySpending).sort(([,a], [,b]) => b - a)[0];
            if (topCategory) {
                return `Your largest expense category is ${topCategory[0]} at $${topCategory[1].toFixed(2)} this month. Here are some ways to reduce it:\n\n• Review all ${topCategory[0].toLowerCase()} expenses and eliminate unnecessary ones\n• Look for cheaper alternatives or better deals\n• Set a specific spending limit for this category\n• Track daily expenses to stay accountable\n\nAlso consider reviewing subscriptions and recurring payments for quick wins.`;
            } else {
                return "To reduce expenses, start by tracking all spending for a week to identify patterns. Common areas to cut include dining out, entertainment subscriptions, and impulse purchases. Try the 24-hour rule: wait a day before making non-essential purchases.";
            }
        }
        
        // Default response
        return "I'm here to help with your financial questions! I can provide advice on budgeting, saving, investing, expense management, and financial planning. Feel free to ask me specific questions about your spending patterns, budget allocation, or financial goals. What specific area of your finances would you like to focus on?";
    }
    
    saveConversation(userMessage, aiResponse) {
        const conversation = {
            userMessage,
            aiResponse,
            timestamp: DateUtils.now()
        };
        
        Storage.saveAIConversation(this.currentUser.id, conversation);
        this.chatHistory.push(conversation);
    }
    
    updateAIStatus(status) {
        const aiStatus = DOM.get('aiStatus');
        if (aiStatus) {
            DOM.setText(aiStatus, status);
        }
    }
    
    renderAnalysis() {
        const analysisContent = DOM.get('analysisContent');
        if (!analysisContent) return;
        
        switch (this.currentAnalysis) {
            case 'spending':
                this.renderSpendingAnalysis(analysisContent);
                break;
            case 'income':
                this.renderIncomeAnalysis(analysisContent);
                break;
            case 'budget':
                this.renderBudgetAnalysis(analysisContent);
                break;
            case 'trends':
                this.renderTrendAnalysis(analysisContent);
                break;
        }
    }
    
    renderSpendingAnalysis(container) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const expenses = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return t.type === 'expense' && transDate >= startOfMonth;
        });
        
        const totalSpent = expenses.reduce((sum, t) => sum + t.amount, 0);
        const avgTransaction = expenses.length > 0 ? totalSpent / expenses.length : 0;
        const transactionCount = expenses.length;
        
        // Calculate daily average
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const dailyAvg = currentDay > 0 ? totalSpent / currentDay : 0;
        const projectedMonthly = dailyAvg * daysInMonth;
        
        container.innerHTML = `
            <div class="analysis-summary">
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(totalSpent)}</div>
                    <div class="stat-label">Total Spent</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(avgTransaction)}</div>
                    <div class="stat-label">Avg Transaction</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${transactionCount}</div>
                    <div class="stat-label">Transactions</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(projectedMonthly)}</div>
                    <div class="stat-label">Projected Monthly</div>
                </div>
            </div>
            <div class="analysis-insights">
                <h4>Spending Insights</h4>
                <ul>
                    <li>Your daily spending average is ${NumberUtils.formatCurrency(dailyAvg)}</li>
                    <li>At current rate, you'll spend ${NumberUtils.formatCurrency(projectedMonthly)} this month</li>
                    <li>Most frequent transaction amount range: ${NumberUtils.formatCurrency(avgTransaction * 0.7)} - ${NumberUtils.formatCurrency(avgTransaction * 1.3)}</li>
                </ul>
            </div>
        `;
    }
    
    renderIncomeAnalysis(container) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const income = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return t.type === 'income' && transDate >= startOfMonth;
        });
        
        const totalIncome = income.reduce((sum, t) => sum + t.amount, 0);
        const incomeCount = income.length;
        const avgIncome = incomeCount > 0 ? totalIncome / incomeCount : 0;
        
        // Calculate income stability
        const lastThreeMonths = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            return t.type === 'income' && transDate >= threeMonthsAgo;
        });
        
        const monthlyIncomes = {};
        lastThreeMonths.forEach(transaction => {
            const month = new Date(transaction.date).toISOString().slice(0, 7);
            monthlyIncomes[month] = (monthlyIncomes[month] || 0) + transaction.amount;
        });
        
        const incomeVariability = Object.values(monthlyIncomes);
        const avgMonthlyIncome = incomeVariability.reduce((sum, val) => sum + val, 0) / incomeVariability.length;
        
        container.innerHTML = `
            <div class="analysis-summary">
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(totalIncome)}</div>
                    <div class="stat-label">Monthly Income</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(avgIncome)}</div>
                    <div class="stat-label">Avg per Source</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${incomeCount}</div>
                    <div class="stat-label">Income Sources</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(avgMonthlyIncome)}</div>
                    <div class="stat-label">3-Month Avg</div>
                </div>
            </div>
            <div class="analysis-insights">
                <h4>Income Insights</h4>
                <ul>
                    <li>Your income consistency: ${incomeVariability.length > 1 ? 'Multiple data points available' : 'Limited data'}</li>
                    <li>Primary income frequency: ${incomeCount === 1 ? 'Single source' : 'Multiple sources'}</li>
                    <li>Income trend: ${totalIncome >= avgMonthlyIncome ? 'Above average' : 'Below average'} this month</li>
                </ul>
            </div>
        `;
    }
    
    renderBudgetAnalysis(container) {
        if (this.budgets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h4>No Budget Data</h4>
                    <p>Set up budgets to see detailed analysis</p>
                    <button class="btn btn-primary" onclick="window.location.href='transactions.html'">
                        Create Budget
                    </button>
                </div>
            `;
            return;
        }
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        let totalBudget = 0;
        let totalSpent = 0;
        let onTrackCategories = 0;
        
        this.budgets.forEach(budget => {
            totalBudget += budget.amount;
            const spent = this.transactions
                .filter(t => {
                    const transDate = new Date(t.date);
                    return t.type === 'expense' && 
                           t.categoryId === budget.categoryId && 
                           transDate >= startOfMonth && 
                           transDate <= endOfMonth;
                })
                .reduce((sum, t) => sum + t.amount, 0);
            
            totalSpent += spent;
            if (spent <= budget.amount) {
                onTrackCategories++;
            }
        });
        
        const budgetUsage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        const remaining = totalBudget - totalSpent;
        const onTrackPercentage = this.budgets.length > 0 ? (onTrackCategories / this.budgets.length) * 100 : 0;
        
        container.innerHTML = `
            <div class="analysis-summary">
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(totalSpent)}</div>
                    <div class="stat-label">Total Spent</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(totalBudget)}</div>
                    <div class="stat-label">Total Budget</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${budgetUsage.toFixed(1)}%</div>
                    <div class="stat-label">Budget Used</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(remaining)}</div>
                    <div class="stat-label">Remaining</div>
                </div>
            </div>
            <div class="analysis-insights">
                <h4>Budget Performance</h4>
                <ul>
                    <li>${onTrackCategories} of ${this.budgets.length} categories are on track (${onTrackPercentage.toFixed(1)}%)</li>
                    <li>Budget utilization: ${budgetUsage < 80 ? 'Conservative' : budgetUsage < 100 ? 'Optimal' : 'Over budget'}</li>
                    <li>Remaining budget can cover ${Math.floor(remaining / (totalSpent / new Date().getDate()))} days at current rate</li>
                </ul>
            </div>
        `;
    }
    
    renderTrendAnalysis(container) {
        // Get last 6 months of data
        const now = new Date();
        const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
        const recentTransactions = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= sixMonthsAgo;
        });
        
        if (recentTransactions.length < 10) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-line"></i>
                    <h4>Insufficient Data</h4>
                    <p>Add more transactions to see trend analysis</p>
                </div>
            `;
            return;
        }
        
        // Group by month
        const monthlyData = {};
        recentTransactions.forEach(transaction => {
            const month = new Date(transaction.date).toISOString().slice(0, 7);
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, expenses: 0 };
            }
            if (transaction.type === 'income') {
                monthlyData[month].income += transaction.amount;
            } else {
                monthlyData[month].expenses += transaction.amount;
            }
        });
        
        const months = Object.keys(monthlyData).sort();
        const avgIncome = months.reduce((sum, month) => sum + monthlyData[month].income, 0) / months.length;
        const avgExpenses = months.reduce((sum, month) => sum + monthlyData[month].expenses, 0) / months.length;
        
        // Calculate trends
        const latestMonth = monthlyData[months[months.length - 1]];
        const incomeChange = avgIncome > 0 ? ((latestMonth.income - avgIncome) / avgIncome) * 100 : 0;
        const expenseChange = avgExpenses > 0 ? ((latestMonth.expenses - avgExpenses) / avgExpenses) * 100 : 0;
        
        container.innerHTML = `
            <div class="analysis-summary">
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(avgIncome)}</div>
                    <div class="stat-label">Avg Income</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${NumberUtils.formatCurrency(avgExpenses)}</div>
                    <div class="stat-label">Avg Expenses</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${incomeChange >= 0 ? '+' : ''}${incomeChange.toFixed(1)}%</div>
                    <div class="stat-label">Income Trend</div>
                </div>
                <div class="summary-stat">
                    <div class="stat-value">${expenseChange >= 0 ? '+' : ''}${expenseChange.toFixed(1)}%</div>
                    <div class="stat-label">Expense Trend</div>
                </div>
            </div>
            <div class="analysis-insights">
                <h4>Trend Analysis</h4>
                <ul>
                    <li>Income trend: ${incomeChange > 5 ? 'Growing steadily' : incomeChange > -5 ? 'Stable' : 'Declining'}</li>
                    <li>Expense trend: ${expenseChange > 10 ? 'Increasing rapidly' : expenseChange > -5 ? 'Stable' : 'Decreasing'}</li>
                    <li>Financial trajectory: ${(incomeChange > expenseChange) ? 'Improving' : 'Needs attention'}</li>
                </ul>
            </div>
        `;
    }
    
    renderRecommendations() {
        const recommendationsGrid = DOM.get('recommendationsGrid');
        if (!recommendationsGrid) return;
        
        const recommendations = this.generateRecommendations();
        
        if (recommendations.length === 0) {
            recommendationsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-lightbulb"></i>
                    <h4>No Recommendations</h4>
                    <p>Add more financial data to receive personalized recommendations</p>
                </div>
            `;
            return;
        }
        
        const recommendationsHTML = recommendations.map(rec => `
            <div class="recommendation-card">
                <div class="recommendation-header">
                    <div class="recommendation-icon">
                        <i class="${rec.icon}"></i>
                    </div>
                    <h4 class="recommendation-title">${rec.title}</h4>
                </div>
                <p class="recommendation-description">${rec.description}</p>
                <div class="recommendation-actions">
                    ${rec.actions.map(action => `
                        <button class="action-btn-sm action-btn-${action.type}" onclick="${action.onClick}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>
            </div>
        `).join('');
        
        recommendationsGrid.innerHTML = recommendationsHTML;
    }
    
    generateRecommendations() {
        const recommendations = [];
        const context = this.prepareFinancialContext();
        
        // Budget recommendation
        if (context.budgetCount === 0) {
            recommendations.push({
                icon: 'fas fa-chart-pie',
                title: 'Set Up Your First Budget',
                description: 'Creating a budget is the foundation of good financial management. Start with the 50/30/20 rule to manage your expenses effectively.',
                actions: [
                    { type: 'primary', label: 'Create Budget', onClick: "window.location.href='transactions.html'" },
                    { type: 'secondary', label: 'Learn More', onClick: "askQuestion('How do I create a budget?')" }
                ]
            });
        }
        
        // Savings recommendation
        if (context.savingsRate < 20) {
            const targetIncrease = Math.max(20 - context.savingsRate, 5);
            recommendations.push({
                icon: 'fas fa-piggy-bank',
                title: 'Boost Your Savings Rate',
                description: `Aim to increase your savings rate by ${targetIncrease.toFixed(1)}% to reach the recommended 20%. Start with small automated transfers to build the habit.`,
                actions: [
                    { type: 'primary', label: 'Get Tips', onClick: "askQuestion('How can I save more money?')" },
                    { type: 'secondary', label: 'View Analysis', onClick: "updateAnalysis()" }
                ]
            });
        }
        
        // Expense optimization
        const topExpenseCategory = Object.entries(context.categorySpending).sort(([,a], [,b]) => b - a)[0];
        if (topExpenseCategory && topExpenseCategory[1] > context.monthlyIncome * 0.3) {
            recommendations.push({
                icon: 'fas fa-cut',
                title: 'Optimize Your Largest Expense',
                description: `Your ${topExpenseCategory[0]} spending is quite high. Consider reviewing and optimizing these expenses to free up money for savings and other goals.`,
                actions: [
                    { type: 'primary', label: 'Get Advice', onClick: `askQuestion('How can I reduce my ${topExpenseCategory[0].toLowerCase()} expenses?')` },
                    { type: 'secondary', label: 'View Details', onClick: "switchToSpendingAnalysis()" }
                ]
            });
        }
        
        // Emergency fund recommendation
        if (context.savingsRate > 0 && context.monthlyExpenses > 0) {
            const emergencyFundTarget = context.monthlyExpenses * 6;
            recommendations.push({
                icon: 'fas fa-shield-alt',
                title: 'Build Emergency Fund',
                description: `Aim for an emergency fund of ${NumberUtils.formatCurrency(emergencyFundTarget)} (6 months of expenses). This provides financial security for unexpected situations.`,
                actions: [
                    { type: 'primary', label: 'Learn How', onClick: "askQuestion('How do I build an emergency fund?')" },
                    { type: 'secondary', label: 'Calculate Goal', onClick: "showEmergencyFundCalculator()" }
                ]
            });
        }
        
        // Investment recommendation
        if (context.savingsRate >= 15 && context.monthlyIncome > 0) {
            recommendations.push({
                icon: 'fas fa-chart-line',
                title: 'Consider Long-term Investing',
                description: 'With your strong savings rate, you might be ready to explore long-term investment options to grow your wealth over time.',
                actions: [
                    { type: 'primary', label: 'Get Started', onClick: "askQuestion('Should I start investing?')" },
                    { type: 'secondary', label: 'Risk Assessment', onClick: "openAISettingsModal()" }
                ]
            });
        }
        
        return recommendations;
    }
    
    // Event Handlers
    askQuestion(question) {
        const chatInput = DOM.get('chatInput');
        if (chatInput) {
            chatInput.value = question;
            this.handleChatSubmit();
        }
    }
    
    updateAnalysis() {
        this.renderAnalysis();
    }
    
    refreshInsights() {
        this.renderInsights();
        NotificationUtils.showMessage('Insights refreshed!', 'success');
    }
    
    generateReport() {
        const context = this.prepareFinancialContext();
        const report = {
            generatedAt: new Date().toISOString(),
            user: {
                name: this.currentUser.fullName,
                email: this.currentUser.email
            },
            summary: {
                monthlyIncome: context.monthlyIncome,
                monthlyExpenses: context.monthlyExpenses,
                savingsRate: context.savingsRate,
                budgetStatus: context.totalBudget > 0 ? (context.monthlyExpenses / context.totalBudget) * 100 : 0
            },
            insights: this.generateInsights(),
            recommendations: this.generateRecommendations(),
            transactions: this.transactions.slice(-50) // Last 50 transactions
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-report-${DateUtils.format(new Date(), 'YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        NotificationUtils.showMessage('Financial report generated!', 'success');
    }
    
    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            // Clear chat history from storage
            Storage.set(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS, 
                Storage.get(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS).filter(conv => conv.userId !== this.currentUser.id)
            );
            
            this.chatHistory = [];
            this.renderChatHistory();
            
            NotificationUtils.showMessage('Chat history cleared!', 'success');
        }
    }
    
    exportChat() {
        const chatData = {
            user: this.currentUser.fullName,
            exportDate: new Date().toISOString(),
            conversations: this.chatHistory
        };
        
        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-chat-history-${DateUtils.format(new Date(), 'YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        NotificationUtils.showMessage('Chat history exported!', 'success');
    }
    
    loadAISettings() {
        DOM.get('responseStyle').value = this.aiSettings.responseStyle;
        DOM.get('focusBudgeting').checked = this.aiSettings.focusAreas.budgeting;
        DOM.get('focusInvestments').checked = this.aiSettings.focusAreas.investments;
        DOM.get('focusSavings').checked = this.aiSettings.focusAreas.savings;
        DOM.get('focusDebt').checked = this.aiSettings.focusAreas.debt;
        DOM.get('riskTolerance').value = this.aiSettings.riskTolerance;
    }
    
    saveAISettings() {
        this.aiSettings = {
            responseStyle: DOM.get('responseStyle').value,
            focusAreas: {
                budgeting: DOM.get('focusBudgeting').checked,
                investments: DOM.get('focusInvestments').checked,
                savings: DOM.get('focusSavings').checked,
                debt: DOM.get('focusDebt').checked
            },
            riskTolerance: parseInt(DOM.get('riskTolerance').value)
        };
        
        Storage.set(`aiSettings_${this.currentUser.id}`, this.aiSettings);
        
        NotificationUtils.showMessage('AI settings saved!', 'success');
        closeAISettingsModal();
    }
    
    generateRecommendations() {
        this.renderRecommendations();
        NotificationUtils.showMessage('New recommendations generated!', 'success');
    }
}

// Global functions for HTML onclick handlers
window.askQuestion = (question) => {
    if (window.aiAdvisorManager) {
        window.aiAdvisorManager.askQuestion(question);
    }
};

window.updateAnalysis = () => {
    if (window.aiAdvisorManager) {
        window.aiAdvisorManager.updateAnalysis();
    }
};

window.refreshInsights = () => {
    if (window.aiAdvisorManager) {
        window.aiAdvisorManager.refreshInsights();
    }
};

window.generateReport = () => {
    if (window.aiAdvisorManager) {
        window.aiAdvisorManager.generateReport();
    }
};

window.clearChat = () => {
    if (window.aiAdvisorManager) {
        window.aiAdvisorManager.clearChat();
    }
};

window.exportChat = () => {
    if (window.aiAdvisorManager) {
        window.aiAdvisorManager.exportChat();
    }
};

window.generateRecommendations = () => {
    if (window.aiAdvisorManager) {
        window.aiAdvisorManager.generateRecommendations();
    }
};

window.openAISettingsModal = () => {
    DOM.show('aiSettingsModal');
};

window.closeAISettingsModal = () => {
    DOM.hide('aiSettingsModal');
};

window.switchToSpendingAnalysis = () => {
    const analysisType = DOM.get('analysisType');
    if (analysisType) {
        analysisType.value = 'spending';
        updateAnalysis();
    }
};

window.showEmergencyFundCalculator = () => {
    askQuestion('How much should I have in my emergency fund?');
};

// Initialize AI advisor when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.aiAdvisorManager = new AIAdvisorManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIAdvisorManager };
}