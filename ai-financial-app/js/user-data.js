// User Data Management

class UserDataManager {
    constructor() {
        this.currentUser = null;
        this.transactions = [];
        this.categories = [];
        this.budgets = [];
        this.selectedIcon = null;
        this.selectedColor = null;
        this.editingCategoryId = null;
        this.init();
    }
    
    init() {
        // Check authentication
        if (!Auth.requireAuth()) return;
        
        this.currentUser = Auth.getCurrentUser();
        this.loadData();
        this.setupEventListeners();
        this.renderUserData();
    }
    
    loadData() {
        this.transactions = Storage.getUserTransactions(this.currentUser.id);
        this.categories = Storage.getCategories();
        this.budgets = Storage.getUserBudgets(this.currentUser.id);
    }
    
    setupEventListeners() {
        // Profile form
        const profileForm = DOM.get('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProfileUpdate();
            });
        }
        
        // Category form
        const categoryForm = DOM.get('categoryForm');
        if (categoryForm) {
            categoryForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCategorySubmit();
            });
        }
        
        // Budget form
        const budgetForm = DOM.get('budgetForm');
        if (budgetForm) {
            budgetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBudgetSubmit();
            });
        }
        
        // Icon picker
        const iconPicker = DOM.get('iconPicker');
        if (iconPicker) {
            iconPicker.addEventListener('click', (e) => {
                if (e.target.closest('.icon-option')) {
                    this.selectIcon(e.target.closest('.icon-option'));
                }
            });
        }
        
        // Color picker
        const colorPicker = DOM.get('colorPicker');
        if (colorPicker) {
            colorPicker.addEventListener('click', (e) => {
                if (e.target.closest('.color-option')) {
                    this.selectColor(e.target.closest('.color-option'));
                }
            });
        }
        
        // Analysis period change
        const analysisPeriod = DOM.get('analysisPeriod');
        if (analysisPeriod) {
            analysisPeriod.addEventListener('change', () => {
                this.updateAnalysis();
            });
        }
    }
    
    renderUserData() {
        this.renderUserInfo();
        this.renderProfileDetails();
        this.renderCategories();
        this.renderAnalysis();
        this.renderBudgets();
        this.populateFormOptions();
    }
    
    renderUserInfo() {
        // Sidebar user info
        const userName = DOM.get('userName');
        const userEmail = DOM.get('userEmail');
        
        if (userName) {
            DOM.setText(userName, this.currentUser.fullName);
        }
        
        if (userEmail) {
            DOM.setText(userEmail, this.currentUser.email);
        }
    }
    
    renderProfileDetails() {
        // Profile header
        DOM.setText('profileName', this.currentUser.fullName);
        DOM.setText('profileEmail', this.currentUser.email);
        
        // Member since
        const memberSince = DateUtils.format(this.currentUser.createdAt, 'MMM YYYY');
        DOM.setText('memberSince', memberSince);
        
        // Stats
        DOM.setText('totalTransactions', this.transactions.length);
        
        const usedCategories = [...new Set(this.transactions.map(t => t.categoryId))].length;
        DOM.setText('categoriesUsed', usedCategories);
        
        // Profile details
        DOM.setText('detailName', this.currentUser.fullName);
        DOM.setText('detailEmail', this.currentUser.email);
        DOM.setText('detailPhone', this.currentUser.phone || 'Not provided');
        DOM.setText('detailWallet', this.currentUser.walletAddress || 'Not connected');
        
        // Preferences
        const preferences = this.currentUser.preferences || {};
        
        const currencySelect = DOM.get('preferredCurrency');
        if (currencySelect) {
            currencySelect.value = preferences.currency || 'USD';
        }
        
        const budgetGoal = DOM.get('budgetGoal');
        if (budgetGoal) {
            budgetGoal.value = preferences.budgetGoal || '';
        }
        
        const savingsGoal = DOM.get('savingsGoal');
        if (savingsGoal) {
            savingsGoal.value = preferences.savingsGoal || '';
        }
        
        const riskTolerance = DOM.get('riskTolerance');
        if (riskTolerance) {
            riskTolerance.value = preferences.riskTolerance || 'medium';
        }
    }
    
    renderCategories() {
        const categoriesGrid = DOM.get('categoriesGrid');
        if (!categoriesGrid) return;
        
        if (this.categories.length === 0) {
            categoriesGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-tags"></i>
                    <h4>No categories yet</h4>
                    <p>Create your first spending category</p>
                    <button class="btn btn-primary" onclick="openCategoryModal()">
                        <i class="fas fa-plus"></i> Add Category
                    </button>
                </div>
            `;
            return;
        }
        
        const categoryHTML = this.categories.map(category => {
            const isDefault = CONFIG.DEFAULT_CATEGORIES.some(cat => cat.id === category.id);
            const usage = this.getCategoryUsage(category.id);
            
            return `
                <div class="category-item ${isDefault ? 'default' : 'custom'}">
                    <div class="category-actions">
                        <button class="category-action edit" onclick="editCategory('${category.id}')" title="Edit Category">
                            <i class="fas fa-edit"></i>
                        </button>
                        ${!isDefault ? `
                            <button class="category-action delete" onclick="deleteCategory('${category.id}')" title="Delete Category">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                    <div class="category-icon" style="background-color: ${category.color}">
                        <i class="${category.icon}"></i>
                    </div>
                    <div class="category-name">${category.name}</div>
                    <div class="category-stats">
                        Used in ${usage.count} transactions<br>
                        Total: ${NumberUtils.formatCurrency(usage.total)}
                    </div>
                </div>
            `;
        }).join('');
        
        categoriesGrid.innerHTML = categoryHTML;
    }
    
    getCategoryUsage(categoryId) {
        const categoryTransactions = this.transactions.filter(t => t.categoryId === categoryId);
        return {
            count: categoryTransactions.length,
            total: categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
        };
    }
    
    renderAnalysis() {
        const period = DOM.get('analysisPeriod')?.value || 'month';
        const analysisData = this.getAnalysisData(period);
        
        this.renderSpendingBreakdown(analysisData);
        this.renderSpendingTrends(analysisData);
    }
    
    getAnalysisData(period) {
        const now = new Date();
        let startDate;
        
        switch (period) {
            case 'week':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }
        
        const periodTransactions = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startDate && t.type === 'expense';
        });
        
        // Group by category
        const categoryTotals = {};
        periodTransactions.forEach(transaction => {
            const category = this.categories.find(cat => cat.id === transaction.categoryId);
            if (category) {
                if (!categoryTotals[category.id]) {
                    categoryTotals[category.id] = {
                        category: category,
                        amount: 0,
                        count: 0
                    };
                }
                categoryTotals[category.id].amount += transaction.amount;
                categoryTotals[category.id].count += 1;
            }
        });
        
        return {
            period: period,
            startDate: startDate,
            transactions: periodTransactions,
            categoryTotals: categoryTotals,
            totalSpent: periodTransactions.reduce((sum, t) => sum + t.amount, 0)
        };
    }
    
    renderSpendingBreakdown(analysisData) {
        const spendingBreakdown = DOM.get('spendingBreakdown');
        if (!spendingBreakdown) return;
        
        const sortedCategories = Object.values(analysisData.categoryTotals)
            .sort((a, b) => b.amount - a.amount);
        
        if (sortedCategories.length === 0) {
            spendingBreakdown.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h4>No spending data</h4>
                    <p>Add some expenses to see your spending breakdown</p>
                </div>
            `;
            return;
        }
        
        const breakdownHTML = sortedCategories.map(categoryData => {
            const percentage = analysisData.totalSpent > 0 ? 
                (categoryData.amount / analysisData.totalSpent) * 100 : 0;
            
            return `
                <div class="breakdown-item">
                    <div class="breakdown-info">
                        <div class="breakdown-category" style="background-color: ${categoryData.category.color}">
                            <i class="${categoryData.category.icon}"></i>
                        </div>
                        <div class="breakdown-details">
                            <h4>${categoryData.category.name}</h4>
                            <p>${categoryData.count} transactions</p>
                        </div>
                    </div>
                    <div class="breakdown-amount">
                        <div class="breakdown-value">${NumberUtils.formatCurrency(categoryData.amount)}</div>
                        <div class="breakdown-percentage">${percentage.toFixed(1)}%</div>
                    </div>
                </div>
            `;
        }).join('');
        
        spendingBreakdown.innerHTML = breakdownHTML;
    }
    
    renderSpendingTrends(analysisData) {
        const trendItems = DOM.get('trendItems');
        if (!trendItems) return;
        
        const trends = this.calculateTrends(analysisData);
        
        const trendHTML = trends.map(trend => `
            <div class="trend-item">
                <div class="trend-icon" style="background-color: ${trend.color}">
                    <i class="${trend.icon}"></i>
                </div>
                <div class="trend-text">
                    <h5>${trend.title}</h5>
                    <p>${trend.description}</p>
                </div>
            </div>
        `).join('');
        
        trendItems.innerHTML = trendHTML;
    }
    
    calculateTrends(analysisData) {
        const trends = [];
        
        // Find top spending category
        const topCategory = Object.values(analysisData.categoryTotals)
            .sort((a, b) => b.amount - a.amount)[0];
        
        if (topCategory) {
            const percentage = (topCategory.amount / analysisData.totalSpent) * 100;
            trends.push({
                icon: 'fas fa-chart-line',
                color: topCategory.category.color,
                title: 'Top Spending Category',
                description: `${topCategory.category.name} accounts for ${percentage.toFixed(1)}% of your spending`
            });
        }
        
        // Average transaction amount
        const avgAmount = analysisData.transactions.length > 0 ?
            analysisData.totalSpent / analysisData.transactions.length : 0;
        
        trends.push({
            icon: 'fas fa-calculator',
            color: '#3b82f6',
            title: 'Average Transaction',
            description: `Your average transaction amount is ${NumberUtils.formatCurrency(avgAmount)}`
        });
        
        // Spending frequency
        const daysWithSpending = new Set(
            analysisData.transactions.map(t => 
                new Date(t.date).toDateString()
            )
        ).size;
        
        trends.push({
            icon: 'fas fa-calendar-alt',
            color: '#10b981',
            title: 'Spending Frequency',
            description: `You made transactions on ${daysWithSpending} different days`
        });
        
        return trends;
    }
    
    renderBudgets() {
        // Budget summary
        const totalBudget = this.budgets.reduce((sum, budget) => sum + budget.amount, 0);
        const allocatedBudget = totalBudget; // All budgets are allocated
        const remainingBudget = 0; // For now, assume no remaining budget
        
        DOM.setText('totalBudget', NumberUtils.formatCurrency(totalBudget));
        DOM.setText('allocatedBudget', NumberUtils.formatCurrency(allocatedBudget));
        DOM.setText('remainingBudget', NumberUtils.formatCurrency(remainingBudget));
        
        // Budget allocations
        const budgetAllocations = DOM.get('budgetAllocations');
        if (!budgetAllocations) return;
        
        if (this.budgets.length === 0) {
            budgetAllocations.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h4>No budgets set</h4>
                    <p>Create your first budget to track spending</p>
                    <button class="btn btn-primary" onclick="openBudgetModal()">
                        <i class="fas fa-plus"></i> Set Budget
                    </button>
                </div>
            `;
            return;
        }
        
        const allocationHTML = this.budgets.map(budget => {
            const category = this.categories.find(cat => cat.id === budget.categoryId);
            const spent = this.getSpentForBudget(budget);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const isOverBudget = percentage > 100;
            
            return `
                <div class="allocation-item">
                    <div class="allocation-category" style="background-color: ${category?.color || '#6b7280'}">
                        <i class="${category?.icon || 'fas fa-circle'}"></i>
                    </div>
                    <div class="allocation-details">
                        <h4>${category?.name || 'Unknown'}</h4>
                        <p>${NumberUtils.formatCurrency(spent)} / ${NumberUtils.formatCurrency(budget.amount)}</p>
                    </div>
                    <div class="allocation-progress">
                        <div class="allocation-bar">
                            <div class="allocation-fill ${isOverBudget ? 'over-budget' : ''}" 
                                 style="width: ${Math.min(percentage, 100)}%"></div>
                        </div>
                        <div class="allocation-text">
                            ${percentage.toFixed(1)}%${isOverBudget ? ' (Over Budget)' : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        budgetAllocations.innerHTML = allocationHTML;
    }
    
    getSpentForBudget(budget) {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        return this.transactions
            .filter(t => {
                const transDate = new Date(t.date);
                return t.type === 'expense' && 
                       t.categoryId === budget.categoryId && 
                       transDate >= startOfMonth && 
                       transDate <= endOfMonth;
            })
            .reduce((sum, t) => sum + t.amount, 0);
    }
    
    populateFormOptions() {
        // Budget category select
        const budgetCategory = DOM.get('budgetCategory');
        if (budgetCategory) {
            const options = this.categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
            budgetCategory.innerHTML = '<option value="">Select category...</option>' + options;
        }
    }
    
    // Event Handlers
    handleProfileUpdate() {
        const fullName = DOM.get('editFullName').value;
        const email = DOM.get('editEmail').value;
        const phone = DOM.get('editPhone').value;
        const walletAddress = DOM.get('editWallet').value;
        
        try {
            // Update user data
            const updatedUser = Storage.updateUser(this.currentUser.id, {
                fullName: fullName,
                email: email,
                phone: phone,
                walletAddress: walletAddress || null
            });
            
            // Update current user
            Storage.setCurrentUser(updatedUser);
            this.currentUser = updatedUser;
            
            // Re-render profile details
            this.renderProfileDetails();
            this.renderUserInfo();
            
            NotificationUtils.showMessage('Profile updated successfully!', 'success');
            closeProfileModal();
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to update profile', 'error');
        }
    }
    
    handleCategorySubmit() {
        const name = DOM.get('categoryName').value;
        const icon = this.selectedIcon;
        const color = this.selectedColor;
        
        if (!name || !icon || !color) {
            NotificationUtils.showMessage('Please fill all required fields', 'error');
            return;
        }
        
        try {
            if (this.editingCategoryId) {
                // Update existing category
                const categories = Storage.getCategories();
                const categoryIndex = categories.findIndex(cat => cat.id === this.editingCategoryId);
                
                if (categoryIndex !== -1) {
                    categories[categoryIndex] = {
                        ...categories[categoryIndex],
                        name: name,
                        icon: icon,
                        color: color
                    };
                    
                    Storage.set(CONFIG.STORAGE_KEYS.CATEGORIES, categories);
                    NotificationUtils.showMessage('Category updated successfully!', 'success');
                }
            } else {
                // Create new category
                const newCategory = {
                    id: StringUtils.generateUUID(),
                    name: name,
                    icon: icon,
                    color: color,
                    createdAt: DateUtils.now()
                };
                
                const categories = Storage.getCategories();
                categories.push(newCategory);
                Storage.set(CONFIG.STORAGE_KEYS.CATEGORIES, categories);
                
                NotificationUtils.showMessage('Category created successfully!', 'success');
            }
            
            // Reload data and re-render
            this.loadData();
            this.renderCategories();
            this.populateFormOptions();
            
            closeCategoryModal();
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to save category', 'error');
        }
    }
    
    handleBudgetSubmit() {
        const categoryId = DOM.get('budgetCategory').value;
        const amount = parseFloat(DOM.get('budgetAmount').value);
        const period = DOM.get('budgetPeriod').value;
        
        if (!categoryId || !amount || amount <= 0) {
            NotificationUtils.showMessage('Please fill all required fields', 'error');
            return;
        }
        
        try {
            // Check if budget already exists for this category
            const existingBudget = this.budgets.find(b => b.categoryId === categoryId);
            
            if (existingBudget) {
                // Update existing budget
                Storage.updateBudget(existingBudget.id, {
                    amount: amount,
                    period: period
                });
                NotificationUtils.showMessage('Budget updated successfully!', 'success');
            } else {
                // Create new budget
                const newBudget = {
                    userId: this.currentUser.id,
                    categoryId: categoryId,
                    amount: amount,
                    period: period
                };
                
                Storage.createBudget(newBudget);
                NotificationUtils.showMessage('Budget created successfully!', 'success');
            }
            
            // Reload data and re-render
            this.loadData();
            this.renderBudgets();
            
            closeBudgetModal();
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to save budget', 'error');
        }
    }
    
    selectIcon(iconElement) {
        // Remove previous selection
        document.querySelectorAll('.icon-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to clicked icon
        iconElement.classList.add('selected');
        this.selectedIcon = iconElement.dataset.icon;
        DOM.get('categoryIcon').value = this.selectedIcon;
    }
    
    selectColor(colorElement) {
        // Remove previous selection
        document.querySelectorAll('.color-option').forEach(el => {
            el.classList.remove('selected');
        });
        
        // Add selection to clicked color
        colorElement.classList.add('selected');
        this.selectedColor = colorElement.dataset.color;
        DOM.get('categoryColor').value = this.selectedColor;
    }
    
    updatePreference(key, value) {
        try {
            const preferences = this.currentUser.preferences || {};
            preferences[key] = value;
            
            const updatedUser = Storage.updateUser(this.currentUser.id, {
                preferences: preferences
            });
            
            Storage.setCurrentUser(updatedUser);
            this.currentUser = updatedUser;
            
            NotificationUtils.showMessage(`${StringUtils.capitalize(key)} updated!`, 'success');
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to update preference', 'error');
        }
    }
    
    updateAnalysis() {
        this.renderAnalysis();
    }
    
    editCategory(categoryId) {
        const category = this.categories.find(cat => cat.id === categoryId);
        if (!category) return;
        
        this.editingCategoryId = categoryId;
        
        // Populate form
        DOM.get('categoryName').value = category.name;
        
        // Select icon
        const iconElement = document.querySelector(`[data-icon="${category.icon}"]`);
        if (iconElement) {
            this.selectIcon(iconElement);
        }
        
        // Select color  
        const colorElement = document.querySelector(`[data-color="${category.color}"]`);
        if (colorElement) {
            this.selectColor(colorElement);
        }
        
        // Update modal title
        DOM.setText('categoryModalTitle', 'Edit Category');
        
        openCategoryModal();
    }
    
    deleteCategory(categoryId) {
        if (confirm('Are you sure you want to delete this category?')) {
            try {
                const categories = Storage.getCategories();
                const filteredCategories = categories.filter(cat => cat.id !== categoryId);
                Storage.set(CONFIG.STORAGE_KEYS.CATEGORIES, filteredCategories);
                
                // Reload data and re-render
                this.loadData();
                this.renderCategories();
                
                NotificationUtils.showMessage('Category deleted successfully!', 'success');
                
            } catch (error) {
                NotificationUtils.showMessage('Failed to delete category', 'error');
            }
        }
    }
    
    uploadProfileImage() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageUrl = e.target.result;
                    
                    // Update user profile image
                    Storage.updateUser(this.currentUser.id, {
                        profileImage: imageUrl
                    });
                    
                    // Update UI
                    const profileImage = DOM.get('profileImage');
                    const avatarPlaceholder = document.querySelector('.avatar-placeholder');
                    
                    if (profileImage && avatarPlaceholder) {
                        profileImage.src = imageUrl;
                        profileImage.classList.remove('hidden');
                        avatarPlaceholder.classList.add('hidden');
                    }
                    
                    NotificationUtils.showMessage('Profile image updated!', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }
    
    exportData() {
        const data = {
            profile: this.currentUser,
            transactions: this.transactions,
            categories: this.categories,
            budgets: this.budgets,
            exportDate: new Date().toISOString()
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `financial-data-${DateUtils.format(new Date(), 'YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        NotificationUtils.showMessage('Data exported successfully!', 'success');
    }
}

// Global functions for HTML onclick handlers
window.openProfileModal = () => {
    const user = Auth.getCurrentUser();
    if (user) {
        DOM.get('editFullName').value = user.fullName;
        DOM.get('editEmail').value = user.email;
        DOM.get('editPhone').value = user.phone || '';
        DOM.get('editWallet').value = user.walletAddress || '';
    }
    DOM.show('profileModal');
};

window.closeProfileModal = () => {
    DOM.hide('profileModal');
    DOM.clearForm('profileForm');
};

window.openCategoryModal = () => {
    DOM.setText('categoryModalTitle', 'Add Category');
    DOM.show('categoryModal');
};

window.closeCategoryModal = () => {
    DOM.hide('categoryModal');
    DOM.clearForm('categoryForm');
    
    // Reset selections
    document.querySelectorAll('.icon-option, .color-option').forEach(el => {
        el.classList.remove('selected');
    });
    
    if (window.userDataManager) {
        window.userDataManager.selectedIcon = null;
        window.userDataManager.selectedColor = null;
        window.userDataManager.editingCategoryId = null;
    }
};

window.openBudgetModal = () => {
    DOM.show('budgetModal');
};

window.closeBudgetModal = () => {
    DOM.hide('budgetModal');
    DOM.clearForm('budgetForm');
};

window.editCategory = (categoryId) => {
    if (window.userDataManager) {
        window.userDataManager.editCategory(categoryId);
    }
};

window.deleteCategory = (categoryId) => {
    if (window.userDataManager) {
        window.userDataManager.deleteCategory(categoryId);
    }
};

window.uploadProfileImage = () => {
    if (window.userDataManager) {
        window.userDataManager.uploadProfileImage();
    }
};

window.exportData = () => {
    if (window.userDataManager) {
        window.userDataManager.exportData();
    }
};

window.updatePreference = (key, value) => {
    if (window.userDataManager) {
        window.userDataManager.updatePreference(key, value);
    }
};

window.updateAnalysis = () => {
    if (window.userDataManager) {
        window.userDataManager.updateAnalysis();
    }
};

window.connectWalletForEdit = async () => {
    const walletAddress = await MetaMask.connectWallet();
    if (walletAddress) {
        DOM.get('editWallet').value = walletAddress;
    }
};

// Initialize user data manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.userDataManager = new UserDataManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { UserDataManager };
}