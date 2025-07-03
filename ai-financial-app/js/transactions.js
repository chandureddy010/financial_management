// Transactions Management System

class TransactionsManager {
    constructor() {
        this.currentUser = null;
        this.transactions = [];
        this.categories = [];
        this.budgets = [];
        this.currentPage = 1;
        this.itemsPerPage = 10;
        this.currentView = 'list';
        this.filters = {
            search: '',
            type: '',
            category: '',
            period: ''
        };
        this.editingTransactionId = null;
        this.wizardData = {
            income: 0,
            priorities: [],
            allocations: {},
            step: 1
        };
        this.init();
    }
    
    init() {
        // Check authentication
        if (!Auth.requireAuth()) return;
        
        this.currentUser = Auth.getCurrentUser();
        this.loadData();
        this.setupEventListeners();
        this.renderTransactions();
    }
    
    loadData() {
        this.transactions = Storage.getUserTransactions(this.currentUser.id);
        this.categories = Storage.getCategories();
        this.budgets = Storage.getUserBudgets(this.currentUser.id);
    }
    
    setupEventListeners() {
        // Transaction form
        const transactionForm = DOM.get('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleTransactionSubmit();
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
        
        // Search and filters
        const searchInput = DOM.get('searchTransactions');
        if (searchInput) {
            searchInput.addEventListener('input', debounce((e) => {
                this.filters.search = e.target.value;
                this.applyFilters();
            }, 300));
        }
        
        const typeFilter = DOM.get('typeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.filters.type = e.target.value;
                this.applyFilters();
            });
        }
        
        const categoryFilter = DOM.get('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.filters.category = e.target.value;
                this.applyFilters();
            });
        }
        
        const periodFilter = DOM.get('periodFilter');
        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                this.filters.period = e.target.value;
                this.applyFilters();
            });
        }
        
        // Set default date to today
        const transactionDate = DOM.get('transactionDate');
        if (transactionDate) {
            transactionDate.value = new Date().toISOString().split('T')[0];
        }
    }
    
    renderTransactions() {
        this.renderUserInfo();
        this.renderSummaryCards();
        this.renderTransactionsList();
        this.renderBudgetGrid();
        this.populateFormOptions();
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
    
    renderSummaryCards() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        // Calculate monthly totals
        const monthlyTransactions = this.transactions.filter(t => {
            const transDate = new Date(t.date);
            return transDate >= startOfMonth && transDate <= endOfMonth;
        });
        
        const monthlyIncome = monthlyTransactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthlyExpenses = monthlyTransactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const netBalance = monthlyIncome - monthlyExpenses;
        
        // Update summary cards
        DOM.setText('monthlyIncome', NumberUtils.formatCurrency(monthlyIncome));
        DOM.setText('monthlyExpenses', NumberUtils.formatCurrency(monthlyExpenses));
        DOM.setText('netBalance', NumberUtils.formatCurrency(netBalance));
        
        // Calculate budget status
        const totalBudget = this.budgets.reduce((sum, budget) => sum + budget.amount, 0);
        const budgetPercentage = totalBudget > 0 ? Math.min((monthlyExpenses / totalBudget) * 100, 100) : 0;
        
        DOM.setText('budgetPercentage', `${Math.round(budgetPercentage)}%`);
        
        const budgetProgress = DOM.get('budgetProgress');
        if (budgetProgress) {
            const rotation = (budgetPercentage / 100) * 360;
            budgetProgress.style.background = `conic-gradient(var(--warning-color) ${rotation}deg, var(--border-color) ${rotation}deg)`;
        }
        
        const budgetStatus = DOM.get('budgetStatus');
        if (budgetStatus) {
            if (budgetPercentage <= 80) {
                DOM.setText(budgetStatus, 'On Track');
                budgetStatus.style.color = 'var(--success-color)';
            } else if (budgetPercentage <= 100) {
                DOM.setText(budgetStatus, 'Near Limit');
                budgetStatus.style.color = 'var(--warning-color)';
            } else {
                DOM.setText(budgetStatus, 'Over Budget');
                budgetStatus.style.color = 'var(--danger-color)';
            }
        }
        
        // Update change percentages (placeholder for now)
        DOM.setText('incomeChange', '+12.5%');
        DOM.setText('expenseChange', '+8.3%');
        DOM.setText('balanceChange', netBalance >= 0 ? '+15.2%' : '-5.8%');
        
        const balanceChange = DOM.get('balanceChange');
        if (balanceChange) {
            balanceChange.className = `change ${netBalance >= 0 ? 'positive' : 'negative'}`;
        }
    }
    
    renderTransactionsList() {
        const container = DOM.get('transactionsContainer');
        if (!container) return;
        
        container.className = `transactions-container ${this.currentView}-view`;
        
        // Apply filters and pagination
        const filteredTransactions = this.getFilteredTransactions();
        const paginatedTransactions = this.getPaginatedTransactions(filteredTransactions);
        
        if (paginatedTransactions.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-receipt"></i>
                    <h4>No transactions found</h4>
                    <p>Add your first transaction or adjust your filters</p>
                    <button class="btn btn-primary" onclick="openTransactionModal()">
                        <i class="fas fa-plus"></i> Add Transaction
                    </button>
                </div>
            `;
            this.renderPagination(0);
            return;
        }
        
        const transactionHTML = paginatedTransactions.map(transaction => {
            const category = this.categories.find(cat => cat.id === transaction.categoryId);
            const isIncome = transaction.type === 'income';
            
            return `
                <div class="transaction-item" onclick="viewTransaction('${transaction.id}')">
                    <div class="transaction-icon" style="background-color: ${category?.color || '#6b7280'}">
                        <i class="${category?.icon || 'fas fa-circle'}"></i>
                    </div>
                    <div class="transaction-details">
                        <h4>${transaction.description || category?.name || 'Unknown Transaction'}</h4>
                        <p>${category?.name || 'Uncategorized'} • ${transaction.recurring !== 'none' ? 'Recurring' : 'One-time'}</p>
                    </div>
                    <div class="transaction-meta">
                        <div class="transaction-amount ${isIncome ? 'income' : 'expense'}">
                            ${isIncome ? '+' : '-'}${NumberUtils.formatCurrency(transaction.amount)}
                        </div>
                        <div class="transaction-date">
                            ${DateUtils.format(transaction.date)}
                        </div>
                    </div>
                    <div class="transaction-actions">
                        <button class="action-btn" onclick="editTransaction('${transaction.id}')" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteTransaction('${transaction.id}')" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = transactionHTML;
        this.renderPagination(filteredTransactions.length);
    }
    
    getFilteredTransactions() {
        return this.transactions.filter(transaction => {
            // Search filter
            if (this.filters.search) {
                const searchTerm = this.filters.search.toLowerCase();
                const category = this.categories.find(cat => cat.id === transaction.categoryId);
                const searchableText = [
                    transaction.description,
                    category?.name,
                    transaction.amount.toString()
                ].join(' ').toLowerCase();
                
                if (!searchableText.includes(searchTerm)) {
                    return false;
                }
            }
            
            // Type filter
            if (this.filters.type && transaction.type !== this.filters.type) {
                return false;
            }
            
            // Category filter
            if (this.filters.category && transaction.categoryId !== this.filters.category) {
                return false;
            }
            
            // Period filter
            if (this.filters.period) {
                const transDate = new Date(transaction.date);
                const now = new Date();
                
                switch (this.filters.period) {
                    case 'today':
                        if (transDate.toDateString() !== now.toDateString()) {
                            return false;
                        }
                        break;
                    case 'week':
                        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                        if (transDate < weekStart) {
                            return false;
                        }
                        break;
                    case 'month':
                        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                        if (transDate < monthStart) {
                            return false;
                        }
                        break;
                    case 'quarter':
                        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
                        if (transDate < quarterStart) {
                            return false;
                        }
                        break;
                    case 'year':
                        const yearStart = new Date(now.getFullYear(), 0, 1);
                        if (transDate < yearStart) {
                            return false;
                        }
                        break;
                }
            }
            
            return true;
        }).sort((a, b) => new Date(b.date) - new Date(a.date));
    }
    
    getPaginatedTransactions(transactions) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return transactions.slice(startIndex, endIndex);
    }
    
    renderPagination(totalItems) {
        const pagination = DOM.get('pagination');
        if (!pagination) return;
        
        const totalPages = Math.ceil(totalItems / this.itemsPerPage);
        
        if (totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }
        
        let paginationHTML = `
            <button class="page-btn" onclick="changePage(${this.currentPage - 1})" ${this.currentPage === 1 ? 'disabled' : ''}>
                <i class="fas fa-chevron-left"></i>
            </button>
        `;
        
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHTML += `
                    <button class="page-btn ${i === this.currentPage ? 'active' : ''}" onclick="changePage(${i})">
                        ${i}
                    </button>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHTML += `<span class="page-ellipsis">...</span>`;
            }
        }
        
        paginationHTML += `
            <button class="page-btn" onclick="changePage(${this.currentPage + 1})" ${this.currentPage === totalPages ? 'disabled' : ''}>
                <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        pagination.innerHTML = paginationHTML;
    }
    
    renderBudgetGrid() {
        const budgetGrid = DOM.get('budgetGrid');
        if (!budgetGrid) return;
        
        if (this.budgets.length === 0) {
            budgetGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-chart-pie"></i>
                    <h4>No budgets set</h4>
                    <p>Create budgets to track your spending limits</p>
                    <button class="btn btn-primary" onclick="openBudgetModal()">
                        <i class="fas fa-plus"></i> Add Budget
                    </button>
                </div>
            `;
            return;
        }
        
        const budgetHTML = this.budgets.map(budget => {
            const category = this.categories.find(cat => cat.id === budget.categoryId);
            const spent = this.getSpentForBudget(budget);
            const percentage = budget.amount > 0 ? (spent / budget.amount) * 100 : 0;
            const isOverBudget = percentage > 100;
            
            return `
                <div class="budget-item">
                    <div class="budget-item-header">
                        <div class="budget-category-icon" style="background-color: ${category?.color || '#6b7280'}">
                            <i class="${category?.icon || 'fas fa-circle'}"></i>
                        </div>
                        <div class="budget-item-info">
                            <h4>${category?.name || 'Unknown'}</h4>
                            <p>${budget.period} budget</p>
                        </div>
                    </div>
                    <div class="budget-progress-bar">
                        <div class="budget-progress-fill ${isOverBudget ? 'over-budget' : ''}" 
                             style="width: ${Math.min(percentage, 100)}%"></div>
                    </div>
                    <div class="budget-stats">
                        <span>${NumberUtils.formatCurrency(spent)} / ${NumberUtils.formatCurrency(budget.amount)}</span>
                        <span class="${isOverBudget ? 'over-budget' : ''}">${percentage.toFixed(1)}%</span>
                    </div>
                </div>
            `;
        }).join('');
        
        budgetGrid.innerHTML = budgetHTML;
    }
    
    getSpentForBudget(budget) {
        const now = new Date();
        let startDate, endDate;
        
        switch (budget.period) {
            case 'weekly':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
                endDate = now;
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        
        return this.transactions
            .filter(t => {
                const transDate = new Date(t.date);
                return t.type === 'expense' && 
                       t.categoryId === budget.categoryId && 
                       transDate >= startDate && 
                       transDate <= endDate;
            })
            .reduce((sum, t) => sum + t.amount, 0);
    }
    
    populateFormOptions() {
        // Transaction category select
        const transactionCategory = DOM.get('transactionCategory');
        if (transactionCategory) {
            const options = this.categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
            transactionCategory.innerHTML = '<option value="">Select category...</option>' + options;
        }
        
        // Budget category select
        const budgetCategory = DOM.get('budgetCategory');
        if (budgetCategory) {
            const options = this.categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
            budgetCategory.innerHTML = '<option value="">Select category...</option>' + options;
        }
        
        // Category filter select
        const categoryFilter = DOM.get('categoryFilter');
        if (categoryFilter) {
            const options = this.categories.map(cat => 
                `<option value="${cat.id}">${cat.name}</option>`
            ).join('');
            categoryFilter.innerHTML = '<option value="">All Categories</option>' + options;
        }
    }
    
    // Event Handlers
    handleTransactionSubmit() {
        const type = document.querySelector('input[name="type"]:checked').value;
        const amount = parseFloat(DOM.get('transactionAmount').value);
        const categoryId = DOM.get('transactionCategory').value;
        const description = DOM.get('transactionDescription').value;
        const date = DOM.get('transactionDate').value;
        const recurring = DOM.get('transactionRecurring').value;
        
        if (!amount || !categoryId || !date) {
            NotificationUtils.showMessage('Please fill in all required fields', 'error');
            return;
        }
        
        try {
            const transactionData = {
                type: type,
                amount: amount,
                categoryId: categoryId,
                description: description,
                date: new Date(date).toISOString(),
                recurring: recurring,
                userId: this.currentUser.id
            };
            
            if (this.editingTransactionId) {
                // Update existing transaction
                Storage.updateTransaction(this.editingTransactionId, transactionData);
                NotificationUtils.showMessage('Transaction updated successfully!', 'success');
            } else {
                // Create new transaction
                Storage.createTransaction(transactionData);
                NotificationUtils.showMessage('Transaction added successfully!', 'success');
            }
            
            // Reload data and refresh views
            this.loadData();
            this.renderTransactions();
            
            closeTransactionModal();
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to save transaction', 'error');
        }
    }
    
    handleBudgetSubmit() {
        const categoryId = DOM.get('budgetCategory').value;
        const amount = parseFloat(DOM.get('budgetAmount').value);
        const period = DOM.get('budgetPeriod').value;
        
        if (!categoryId || !amount || amount <= 0) {
            NotificationUtils.showMessage('Please fill in all required fields', 'error');
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
                const budgetData = {
                    userId: this.currentUser.id,
                    categoryId: categoryId,
                    amount: amount,
                    period: period
                };
                
                Storage.createBudget(budgetData);
                NotificationUtils.showMessage('Budget created successfully!', 'success');
            }
            
            // Reload data and refresh views
            this.loadData();
            this.renderTransactions();
            
            closeBudgetModal();
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to save budget', 'error');
        }
    }
    
    applyFilters() {
        this.currentPage = 1; // Reset to first page
        this.renderTransactionsList();
    }
    
    changePage(page) {
        const filteredTransactions = this.getFilteredTransactions();
        const totalPages = Math.ceil(filteredTransactions.length / this.itemsPerPage);
        
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderTransactionsList();
        }
    }
    
    switchView(view) {
        this.currentView = view;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        
        // Re-render transactions with new view
        this.renderTransactionsList();
    }
    
    editTransaction(transactionId) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (!transaction) return;
        
        this.editingTransactionId = transactionId;
        
        // Populate form
        document.querySelector(`input[name="type"][value="${transaction.type}"]`).checked = true;
        DOM.get('transactionAmount').value = transaction.amount;
        DOM.get('transactionCategory').value = transaction.categoryId;
        DOM.get('transactionDescription').value = transaction.description || '';
        DOM.get('transactionDate').value = new Date(transaction.date).toISOString().split('T')[0];
        DOM.get('transactionRecurring').value = transaction.recurring || 'none';
        
        // Update modal title
        DOM.setText('transactionModalTitle', 'Edit Transaction');
        
        openTransactionModal();
    }
    
    deleteTransaction(transactionId) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                Storage.deleteTransaction(transactionId);
                
                // Reload data and refresh views
                this.loadData();
                this.renderTransactions();
                
                NotificationUtils.showMessage('Transaction deleted successfully!', 'success');
                
            } catch (error) {
                NotificationUtils.showMessage('Failed to delete transaction', 'error');
            }
        }
    }
    
    viewTransaction(transactionId) {
        // For now, just edit the transaction
        // In a more complete app, you might show a read-only modal
        this.editTransaction(transactionId);
    }
    
    exportTransactions() {
        const data = {
            transactions: this.transactions,
            categories: this.categories,
            budgets: this.budgets,
            exportDate: new Date().toISOString(),
            user: {
                name: this.currentUser.fullName,
                email: this.currentUser.email
            }
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${DateUtils.format(new Date(), 'YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        NotificationUtils.showMessage('Transactions exported successfully!', 'success');
    }
    
    importTransactions() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        
                        // Validate data structure
                        if (data.transactions && Array.isArray(data.transactions)) {
                            // Import transactions
                            data.transactions.forEach(transaction => {
                                const newTransaction = {
                                    ...transaction,
                                    id: StringUtils.generateUUID(),
                                    userId: this.currentUser.id,
                                    createdAt: DateUtils.now(),
                                    updatedAt: DateUtils.now()
                                };
                                
                                Storage.createTransaction(newTransaction);
                            });
                            
                            // Reload data and refresh views
                            this.loadData();
                            this.renderTransactions();
                            
                            NotificationUtils.showMessage(`Imported ${data.transactions.length} transactions successfully!`, 'success');
                        } else {
                            throw new Error('Invalid file format');
                        }
                        
                    } catch (error) {
                        NotificationUtils.showMessage('Failed to import transactions. Please check the file format.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    // Budget Wizard Methods
    openBudgetWizard() {
        this.wizardData = {
            income: 0,
            priorities: [...this.categories],
            allocations: {},
            step: 1
        };
        
        DOM.show('budgetWizardModal');
        this.renderWizardStep();
    }
    
    renderWizardStep() {
        // Update step indicators
        document.querySelectorAll('.wizard-steps .step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.wizardData.step);
            step.classList.toggle('completed', index + 1 < this.wizardData.step);
        });
        
        // Show/hide step content
        document.querySelectorAll('.wizard-step').forEach((step, index) => {
            step.classList.toggle('active', index + 1 === this.wizardData.step);
        });
        
        // Update navigation buttons
        const prevBtn = DOM.get('prevBtn');
        const nextBtn = DOM.get('nextBtn');
        const finishBtn = DOM.get('finishBtn');
        
        if (prevBtn) prevBtn.disabled = this.wizardData.step === 1;
        if (nextBtn) nextBtn.classList.toggle('hidden', this.wizardData.step === 4);
        if (finishBtn) finishBtn.classList.toggle('hidden', this.wizardData.step !== 4);
        
        // Render step-specific content
        switch (this.wizardData.step) {
            case 2:
                this.renderPriorities();
                break;
            case 3:
                this.renderAllocationSliders();
                break;
            case 4:
                this.renderBudgetReview();
                break;
        }
    }
    
    renderPriorities() {
        const prioritiesList = DOM.get('prioritiesList');
        if (!prioritiesList) return;
        
        const prioritiesHTML = this.wizardData.priorities.map((category, index) => `
            <div class="priority-item" draggable="true" data-category-id="${category.id}">
                <div class="priority-rank">${index + 1}</div>
                <div class="priority-icon" style="background-color: ${category.color}">
                    <i class="${category.icon}"></i>
                </div>
                <div class="priority-name">${category.name}</div>
                <div class="priority-drag">
                    <i class="fas fa-grip-vertical"></i>
                </div>
            </div>
        `).join('');
        
        prioritiesList.innerHTML = prioritiesHTML;
        
        // Add drag and drop functionality
        this.setupDragAndDrop(prioritiesList);
    }
    
    setupDragAndDrop(container) {
        let draggedElement = null;
        
        container.addEventListener('dragstart', (e) => {
            draggedElement = e.target.closest('.priority-item');
            e.target.style.opacity = '0.5';
        });
        
        container.addEventListener('dragend', (e) => {
            e.target.style.opacity = '';
            draggedElement = null;
        });
        
        container.addEventListener('dragover', (e) => {
            e.preventDefault();
        });
        
        container.addEventListener('drop', (e) => {
            e.preventDefault();
            const targetElement = e.target.closest('.priority-item');
            
            if (draggedElement && targetElement && draggedElement !== targetElement) {
                const allItems = [...container.querySelectorAll('.priority-item')];
                const draggedIndex = allItems.indexOf(draggedElement);
                const targetIndex = allItems.indexOf(targetElement);
                
                // Update priorities array
                const draggedCategory = this.wizardData.priorities[draggedIndex];
                this.wizardData.priorities.splice(draggedIndex, 1);
                this.wizardData.priorities.splice(targetIndex, 0, draggedCategory);
                
                // Re-render
                this.renderPriorities();
            }
        });
    }
    
    renderAllocationSliders() {
        const allocationSliders = DOM.get('allocationSliders');
        if (!allocationSliders) return;
        
        const income = this.wizardData.income;
        
        const slidersHTML = this.wizardData.priorities.map(category => {
            const currentAllocation = this.wizardData.allocations[category.id] || 0;
            const percentage = income > 0 ? (currentAllocation / income) * 100 : 0;
            
            return `
                <div class="allocation-slider">
                    <div class="slider-header">
                        <div class="slider-category">
                            <div class="category-icon" style="background-color: ${category.color}">
                                <i class="${category.icon}"></i>
                            </div>
                            <span>${category.name}</span>
                        </div>
                        <div class="slider-value">
                            ${NumberUtils.formatCurrency(currentAllocation)} (${percentage.toFixed(1)}%)
                        </div>
                    </div>
                    <input type="range" class="slider-input" 
                           min="0" max="${income}" step="10" 
                           value="${currentAllocation}"
                           data-category-id="${category.id}"
                           oninput="updateAllocation('${category.id}', this.value)">
                </div>
            `;
        }).join('');
        
        allocationSliders.innerHTML = slidersHTML;
        this.updateAllocationSummary();
    }
    
    updateAllocation(categoryId, value) {
        this.wizardData.allocations[categoryId] = parseFloat(value);
        this.renderAllocationSliders();
    }
    
    updateAllocationSummary() {
        const totalAllocated = Object.values(this.wizardData.allocations).reduce((sum, amount) => sum + amount, 0);
        const remaining = this.wizardData.income - totalAllocated;
        
        DOM.setText('totalAllocated', NumberUtils.formatCurrency(totalAllocated));
        DOM.setText('remainingAmount', NumberUtils.formatCurrency(remaining));
        
        const remainingElement = DOM.get('remainingAmount');
        if (remainingElement) {
            remainingElement.style.color = remaining >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        }
    }
    
    renderBudgetReview() {
        const budgetReview = DOM.get('budgetReview');
        if (!budgetReview) return;
        
        const reviewHTML = Object.entries(this.wizardData.allocations)
            .filter(([_, amount]) => amount > 0)
            .map(([categoryId, amount]) => {
                const category = this.categories.find(cat => cat.id === categoryId);
                const percentage = (amount / this.wizardData.income) * 100;
                
                return `
                    <div class="review-item">
                        <div class="review-category">
                            <div class="category-icon" style="background-color: ${category.color}">
                                <i class="${category.icon}"></i>
                            </div>
                            <span>${category.name}</span>
                        </div>
                        <div class="review-allocation">
                            ${NumberUtils.formatCurrency(amount)} (${percentage.toFixed(1)}%)
                        </div>
                    </div>
                `;
            }).join('');
        
        budgetReview.innerHTML = reviewHTML;
    }
    
    nextStep() {
        if (this.wizardData.step === 1) {
            const income = parseFloat(DOM.get('wizardIncome').value);
            if (!income || income <= 0) {
                NotificationUtils.showMessage('Please enter a valid income amount', 'error');
                return;
            }
            this.wizardData.income = income;
        }
        
        if (this.wizardData.step < 4) {
            this.wizardData.step++;
            this.renderWizardStep();
        }
    }
    
    prevStep() {
        if (this.wizardData.step > 1) {
            this.wizardData.step--;
            this.renderWizardStep();
        }
    }
    
    finishBudgetWizard() {
        try {
            // Create budgets based on allocations
            Object.entries(this.wizardData.allocations).forEach(([categoryId, amount]) => {
                if (amount > 0) {
                    const existingBudget = this.budgets.find(b => b.categoryId === categoryId);
                    
                    if (existingBudget) {
                        Storage.updateBudget(existingBudget.id, {
                            amount: amount,
                            period: 'monthly'
                        });
                    } else {
                        Storage.createBudget({
                            userId: this.currentUser.id,
                            categoryId: categoryId,
                            amount: amount,
                            period: 'monthly'
                        });
                    }
                }
            });
            
            // Update user's budget goal preference
            const preferences = this.currentUser.preferences || {};
            preferences.budgetGoal = this.wizardData.income;
            
            Storage.updateUser(this.currentUser.id, { preferences });
            
            // Reload data and refresh views
            this.loadData();
            this.renderTransactions();
            
            closeBudgetWizard();
            
            NotificationUtils.showMessage('Budget wizard completed successfully!', 'success');
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to create budgets', 'error');
        }
    }
}

// Global functions for HTML onclick handlers
window.openTransactionModal = () => {
    DOM.setText('transactionModalTitle', 'Add Transaction');
    DOM.show('transactionModal');
    
    // Reset editing ID
    if (window.transactionsManager) {
        window.transactionsManager.editingTransactionId = null;
    }
};

window.closeTransactionModal = () => {
    DOM.hide('transactionModal');
    DOM.clearForm('transactionForm');
    
    if (window.transactionsManager) {
        window.transactionsManager.editingTransactionId = null;
    }
};

window.openBudgetModal = () => {
    DOM.show('budgetModal');
};

window.closeBudgetModal = () => {
    DOM.hide('budgetModal');
    DOM.clearForm('budgetForm');
};

window.openBudgetWizard = () => {
    if (window.transactionsManager) {
        window.transactionsManager.openBudgetWizard();
    }
};

window.closeBudgetWizard = () => {
    DOM.hide('budgetWizardModal');
};

window.switchView = (view) => {
    if (window.transactionsManager) {
        window.transactionsManager.switchView(view);
    }
};

window.changePage = (page) => {
    if (window.transactionsManager) {
        window.transactionsManager.changePage(page);
    }
};

window.editTransaction = (transactionId) => {
    if (window.transactionsManager) {
        window.transactionsManager.editTransaction(transactionId);
    }
};

window.deleteTransaction = (transactionId) => {
    if (window.transactionsManager) {
        window.transactionsManager.deleteTransaction(transactionId);
    }
};

window.viewTransaction = (transactionId) => {
    if (window.transactionsManager) {
        window.transactionsManager.viewTransaction(transactionId);
    }
};

window.exportTransactions = () => {
    if (window.transactionsManager) {
        window.transactionsManager.exportTransactions();
    }
};

window.importTransactions = () => {
    if (window.transactionsManager) {
        window.transactionsManager.importTransactions();
    }
};

window.nextStep = () => {
    if (window.transactionsManager) {
        window.transactionsManager.nextStep();
    }
};

window.prevStep = () => {
    if (window.transactionsManager) {
        window.transactionsManager.prevStep();
    }
};

window.updateAllocation = (categoryId, value) => {
    if (window.transactionsManager) {
        window.transactionsManager.updateAllocation(categoryId, value);
    }
};

window.finishBudgetWizard = () => {
    if (window.transactionsManager) {
        window.transactionsManager.finishBudgetWizard();
    }
};

// Initialize transactions manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.transactionsManager = new TransactionsManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TransactionsManager };
}