// Dashboard Logic

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.transactions = [];
        this.budgets = [];
        this.categories = [];
        this.init();
    }
    
    init() {
        // Check authentication
        if (!Auth.requireAuth()) return;
        
        this.currentUser = Auth.getCurrentUser();
        this.loadData();
        this.setupEventListeners();
        this.renderDashboard();
    }
    
    loadData() {
        // Load user data
        this.transactions = Storage.getUserTransactions(this.currentUser.id);
        this.budgets = Storage.getUserBudgets(this.currentUser.id);
        this.categories = Storage.getCategories();
    }
    
    setupEventListeners() {
        // Quick add form
        const quickAddForm = DOM.get('quickAddForm');
        if (quickAddForm) {
            quickAddForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleQuickAdd();
            });
        }
        
        // Period change handlers
        const categoryPeriod = DOM.get('categoryPeriod');
        if (categoryPeriod) {
            categoryPeriod.addEventListener('change', () => {
                this.updateCategoryChart();
            });
        }
        
        const incomeExpensePeriod = DOM.get('incomeExpensePeriod');
        if (incomeExpensePeriod) {
            incomeExpensePeriod.addEventListener('change', () => {
                this.updateIncomeExpenseChart();
            });
        }
    }
    
    renderDashboard() {
        this.renderUserInfo();
        this.renderOverviewCards();
        this.renderCharts();
        this.renderBudgets();
        this.renderRecentTransactions();
        this.renderAIInsights();
        this.populateQuickAddCategories();
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
    
    renderOverviewCards() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Calculate totals
        const totalIncome = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const totalExpenses = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
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
        
        const totalBalance = totalIncome - totalExpenses;
        
        // Update cards
        DOM.setText('totalBalance', NumberUtils.formatCurrency(totalBalance));
        DOM.setText('monthlyIncome', NumberUtils.formatCurrency(monthlyIncome));
        DOM.setText('monthlyExpenses', NumberUtils.formatCurrency(monthlyExpenses));
        
        // Calculate savings goal (example: 20% of income)
        const savingsGoal = monthlyIncome * 0.20;
        const actualSavings = monthlyIncome - monthlyExpenses;
        const savingsPercentage = savingsGoal > 0 ? Math.min((actualSavings / savingsGoal) * 100, 100) : 0;
        
        DOM.setText('savingsGoal', NumberUtils.formatCurrency(savingsGoal));
        DOM.setText('savingsPercentage', `${Math.round(savingsPercentage)}%`);
        
        const savingsProgressBar = DOM.get('savingsProgress');
        if (savingsProgressBar) {
            savingsProgressBar.style.width = `${savingsPercentage}%`;
        }
        
        // Calculate changes (placeholder for now)
        DOM.setText('balanceChange', '+5.2%');
        DOM.setText('incomeChange', '+12.5%');
        DOM.setText('expenseChange', '+8.3%');
    }
    
    renderCharts() {
        // Category chart
        this.updateCategoryChart();
        
        // Income vs expense chart
        this.updateIncomeExpenseChart();
    }
    
    updateCategoryChart() {
        const period = DOM.get('categoryPeriod')?.value || 'month';
        Charts.createCategoryChart('categoryChart', this.transactions, period);
    }
    
    updateIncomeExpenseChart() {
        const period = DOM.get('incomeExpensePeriod')?.value || 'year';
        Charts.createIncomeExpenseChart('incomeExpenseChart', this.transactions, period);
    }
    
    renderBudgets() {
        const budgetList = DOM.get('budgetList');
        if (!budgetList) return;
        
        if (this.budgets.length === 0) {
            budgetList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h4>No budgets set</h4>
                    <p>Create your first budget to track spending</p>
                    <button class="btn btn-primary btn-sm" onclick="manageBudgets()">
                        <i class="fas fa-plus"></i> Create Budget
                    </button>
                </div>
            `;
            return;
        }
        
        const budgetHTML = this.budgets.map(budget => {
            const category = this.categories.find(cat => cat.id === budget.categoryId);
            const spent = this.getSpentForCategory(budget.categoryId);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            
            return `
                <div class="budget-item">
                    <div class="budget-info">
                        <div class="budget-category" style="background-color: ${category?.color || '#6b7280'}">
                            <i class="${category?.icon || 'fas fa-circle'}"></i>
                        </div>
                        <div class="budget-details">
                            <h4>${category?.name || 'Unknown'}</h4>
                            <p>${NumberUtils.formatCurrency(spent)} of ${NumberUtils.formatCurrency(budget.amount)}</p>
                        </div>
                    </div>
                    <div class="budget-progress">
                        <div class="budget-progress-bar">
                            <div class="budget-progress-fill" style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="budget-progress-text">${Math.round(percentage)}%</div>
                    </div>
                </div>
            `;
        }).join('');
        
        budgetList.innerHTML = budgetHTML;
    }
    
    getSpentForCategory(categoryId) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return this.transactions
            .filter(t => {
                const transDate = new Date(t.date);
                return t.type === 'expense' && 
                       t.categoryId === categoryId && 
                       transDate >= startOfMonth && 
                       transDate <= endOfMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);
    }
    
    renderRecentTransactions() {
        const recentTransactions = DOM.get('recentTransactions');
        if (!recentTransactions) return;
        
        const recent = this.transactions
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5);
        
        if (recent.length === 0) {
            recentTransactions.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h4>No transactions yet</h4>
                    <p>Add your first transaction to get started</p>
                    <button class="btn btn-primary btn-sm" onclick="openQuickAddModal()">
                        <i class="fas fa-plus"></i> Add Transaction
                    </button>
                </div>
            `;
            return;
        }
        
        const transactionHTML = recent.map(transaction => {
            const category = this.categories.find(cat => cat.id === transaction.categoryId);
            const isIncome = transaction.type === 'income';
            
            return `
                <div class="transaction-item">
                    <div class="transaction-icon" style="background-color: ${category?.color || '#6b7280'}">
                        <i class="${category?.icon || 'fas fa-circle'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description || category?.name || 'Unknown'}</h4>
                        <p>${DateUtils.getRelativeTime(transaction.date)}</p>
                    </div>
                    <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                        ${isIncome ? '+' : '-'}${NumberUtils.formatCurrency(transaction.amount)}
                    </div>
                </div>
            `;
        }).join('');
        
        recentTransactions.innerHTML = transactionHTML;
    }
    
    renderAIInsights() {
        const aiInsights = DOM.get('aiInsights');
        if (!aiInsights) return;
        
        // Generate basic insights based on user data
        const insights = this.generateBasicInsights();
        
        const insightHTML = insights.map(insight => `
            <div class="insight-item">
                <div class="insight-icon">
                    <i class="${insight.icon}"></i>
                </div>
                <div class="insight-text">
                    <h4>${insight.title}</h4>
                    <p>${insight.description}</p>
                </div>
            </div>
        `).join('');
        
        aiInsights.innerHTML = insightHTML;
    }
    
    generateBasicInsights() {
        const insights = [];
        
        if (this.transactions.length === 0) {
            insights.push({
                icon: 'fas fa-chart-line',
                title: 'Start Tracking',
                description: 'Add your first transaction to get personalized insights about your spending patterns.'
            });
        } else {
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            
            const monthlyExpenses = this.transactions
                .filter(t => {
                    const transDate = new Date(t.date);
                    return t.type === 'expense' && transDate >= startOfMonth && transDate <= endOfMonth;
                })
                .reduce((sum, t) => sum + t.amount, 0);
            
            const monthlyIncome = this.transactions
                .filter(t => {
                    const transDate = new Date(t.date);
                    return t.type === 'income' && transDate >= startOfMonth && transDate <= endOfMonth;
                })
                .reduce((sum, t) => sum + t.amount, 0);
            
            // Spending insight
            if (monthlyExpenses > monthlyIncome * 0.8) {
                insights.push({
                    icon: 'fas fa-exclamation-triangle',
                    title: 'High Spending Alert',
                    description: `You've spent ${NumberUtils.formatCurrency(monthlyExpenses)} this month, which is ${Math.round((monthlyExpenses / monthlyIncome) * 100)}% of your income.`
                });
            }
            
            // Savings insight
            const savings = monthlyIncome - monthlyExpenses;
            if (savings > 0) {
                insights.push({
                    icon: 'fas fa-piggy-bank',
                    title: 'Great Savings!',
                    description: `You've saved ${NumberUtils.formatCurrency(savings)} this month. Consider investing it for long-term growth.`
                });
            }
            
            // Category insight
            const categoryExpenses = {};
            this.transactions
                .filter(t => t.type === 'expense')
                .forEach(t => {
                    const category = this.categories.find(cat => cat.id === t.categoryId);
                    const categoryName = category?.name || 'Others';
                    categoryExpenses[categoryName] = (categoryExpenses[categoryName] || 0) + t.amount;
                });
            
            const topCategory = Object.entries(categoryExpenses)
                .sort(([,a], [,b]) => b - a)[0];
            
            if (topCategory) {
                insights.push({
                    icon: 'fas fa-chart-pie',
                    title: 'Top Spending Category',
                    description: `Your highest spending category is ${topCategory[0]} with ${NumberUtils.formatCurrency(topCategory[1])} spent.`
                });
            }
        }
        
        return insights;
    }
    
    populateQuickAddCategories() {
        const categorySelect = DOM.get('quickCategory');
        if (!categorySelect) return;
        
        const categoryOptions = this.categories.map(category => 
            `<option value="${category.id}">${category.name}</option>`
        ).join('');
        
        categorySelect.innerHTML = '<option value="">Select category...</option>' + categoryOptions;
    }
    
    handleQuickAdd() {
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = parseFloat(DOM.get('quickAmount').value);
        const categoryId = DOM.get('quickCategory').value;
        const description = DOM.get('quickDescription').value;
        
        if (!amount || !categoryId) {
            NotificationUtils.showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        const transaction = {
            userId: this.currentUser.id,
            type: type,
            amount: amount,
            categoryId: categoryId,
            description: description,
            date: new Date().toISOString()
        };
        
        Storage.createTransaction(transaction);
        
        NotificationUtils.showMessage('Transaction added successfully!', 'success');
        
        // Refresh data and charts
        this.loadData();
        this.renderDashboard();
        
        // Close modal
        closeQuickAddModal();
    }
    
    refreshDashboard() {
        this.loadData();
        this.renderDashboard();
        NotificationUtils.showMessage('Dashboard refreshed!', 'success');
    }
    
    async generateAIInsights() {
        // This would call the AI service with user data
        NotificationUtils.showMessage('AI insights generation coming soon!', 'info');
    }
}

// Global functions for HTML onclick handlers
window.toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('open');
};

window.logout = () => {
    Auth.logout();
};

window.openQuickAddModal = () => {
    DOM.show('quickAddModal');
};

window.closeQuickAddModal = () => {
    DOM.hide('quickAddModal');
    DOM.clearForm('quickAddForm');
};

window.refreshDashboard = () => {
    if (window.dashboardManager) {
        window.dashboardManager.refreshDashboard();
    }
};

window.updateCategoryChart = () => {
    if (window.dashboardManager) {
        window.dashboardManager.updateCategoryChart();
    }
};

window.updateIncomeExpenseChart = () => {
    if (window.dashboardManager) {
        window.dashboardManager.updateIncomeExpenseChart();
    }
};

window.manageBudgets = () => {
    window.location.href = CONFIG.ROUTES.TRANSACTIONS;
};

window.generateNewInsights = () => {
    if (window.dashboardManager) {
        window.dashboardManager.generateAIInsights();
    }
};

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboardManager = new DashboardManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DashboardManager };
}