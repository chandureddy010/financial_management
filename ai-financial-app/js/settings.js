// Settings Management System

class SettingsManager {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'account';
        this.userSettings = this.getDefaultSettings();
        this.hasChanges = false;
        this.init();
    }
    
    init() {
        // Check authentication
        if (!Auth.requireAuth()) return;
        
        this.currentUser = Auth.getCurrentUser();
        this.loadUserSettings();
        this.setupEventListeners();
        this.renderSettings();
    }
    
    getDefaultSettings() {
        return {
            account: {
                fullName: '',
                email: '',
                phone: '',
                timezone: 'America/New_York',
                bio: '',
                profilePicture: null
            },
            security: {
                smsAuth: false,
                emailAuth: true
            },
            preferences: {
                theme: 'light',
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY',
                budgetCycle: 'monthly',
                startOfWeek: 1,
                showQuickStats: true,
                animatedCharts: true,
                autoRefresh: false
            },
            notifications: {
                budgetAlerts: true,
                weeklyReports: true,
                goalAchievements: true,
                securityAlerts: true,
                transactionReminders: false,
                aiInsights: true,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00'
            },
            privacy: {
                usageAnalytics: true,
                crashReports: true,
                personalizedTips: true,
                marketingComms: false,
                profileVisibility: 'private'
            }
        };
    }
    
    loadUserSettings() {
        // Load settings from user preferences or use defaults
        const savedSettings = Storage.get(`userSettings_${this.currentUser.id}`);
        if (savedSettings) {
            this.userSettings = { ...this.userSettings, ...savedSettings };
        }
        
        // Merge with user data
        this.userSettings.account = {
            ...this.userSettings.account,
            fullName: this.currentUser.fullName || '',
            email: this.currentUser.email || '',
            phone: this.current || '',
            profilePicture: this.currentUser.profileImage || null
        };
    }
    
    setupEventListeners() {
        // Account form
        const accountForm = DOM.get('accountForm');
        if (accountForm) {
            accountForm.addEventListener('input', () => this.markAsChanged());
        }
        
        // Password form
        const passwordForm = DOM.get('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handlePasswordChange();
            });
        }
        
        // Delete account form
        const deleteAccountForm = DOM.get('deleteAccountForm');
        if (deleteAccountForm) {
            deleteAccountForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAccountDeletion();
            });
        }
        
        // Auto-save for preference changes
        this.setupAutoSave();
        
        // Password strength checker
        this.setupPasswordStrengthChecker();
        
        // Before unload warning
        window.addEventListener('beforeunload', (e) => {
            if (this.hasChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
            }
        });
    }
    
    setupAutoSave() {
        // Theme selection
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.userSettings.preferences.theme = e.target.value;
                this.saveSettings();
                this.applyTheme(e.target.value);
            });
        });
        
        // All toggle switches
        const toggles = document.querySelectorAll('.toggle-switch input[type="checkbox"]');
        toggles.forEach(toggle => {
            toggle.addEventListener('change', () => {
                this.updateSettingFromInput(toggle);
                this.markAsChanged();
            });
        });
        
        // All select dropdowns
        const selects = document.querySelectorAll('.settings-panel select');
        selects.forEach(select => {
            select.addEventListener('change', () => {
                this.updateSettingFromInput(select);
                this.markAsChanged();
            });
        });
        
        // Time inputs
        const timeInputs = document.querySelectorAll('input[type="time"]');
        timeInputs.forEach(input => {
            input.addEventListener('change', () => {
                this.updateSettingFromInput(input);
                this.markAsChanged();
            });
        });
    }
    
    setupPasswordStrengthChecker() {
        const passwordInput = DOM.get('newPassword');
        const strengthDisplay = DOM.get('passwordStrength');
        
        if (passwordInput && strengthDisplay) {
            passwordInput.addEventListener('input', debounce((e) => {
                const password = e.target.value;
                if (password) {
                    checkPasswordStrength(password, strengthDisplay);
                    DOM.show(strengthDisplay);
                } else {
                    DOM.hide(strengthDisplay);
                }
            }, 300));
        }
        
        // Confirm password validation
        setupConfirmPasswordValidation('newPassword', 'confirmNewPassword');
    }
    
    updateSettingFromInput(input) {
        const settingPath = this.getSettingPath(input.id);
        if (settingPath) {
            const value = input.type === 'checkbox' ? input.checked : input.value;
            this.setNestedSetting(settingPath, value);
        }
    }
    
    getSettingPath(inputId) {
        const mapping = {
            // Preferences
            'currency': 'preferences.currency',
            'dateFormat': 'preferences.dateFormat',
            'budgetCycle': 'preferences.budgetCycle',
            'startOfWeek': 'preferences.startOfWeek',
            'showQuickStats': 'preferences.showQuickStats',
            'animatedCharts': 'preferences.animatedCharts',
            'autoRefresh': 'preferences.autoRefresh',
            
            // Security
            'smsAuth': 'security.smsAuth',
            'emailAuth': 'security.emailAuth',
            
            // Notifications
            'budgetAlerts': 'notifications.budgetAlerts',
            'weeklyReports': 'notifications.weeklyReports',
            'goalAchievements': 'notifications.goalAchievements',
            'securityAlerts': 'notifications.securityAlerts',
            'transactionReminders': 'notifications.transactionReminders',
            'aiInsights': 'notifications.aiInsights',
            'quietHoursStart': 'notifications.quietHoursStart',
            'quietHoursEnd': 'notifications.quietHoursEnd',
            
            // Privacy
            'usageAnalytics': 'privacy.usageAnalytics',
            'crashReports': 'privacy.crashReports',
            'personalizedTips': 'privacy.personalizedTips',
            'marketingComms': 'privacy.marketingComms',
            'profileVisibility': 'privacy.profileVisibility'
        };
        
        return mapping[inputId];
    }
    
    setNestedSetting(path, value) {
        const parts = path.split('.');
        let obj = this.userSettings;
        
        for (let i = 0; i < parts.length - 1; i++) {
            if (!obj[parts[i]]) obj[parts[i]] = {};
            obj = obj[parts[i]];
        }
        
        obj[parts[parts.length - 1]] = value;
    }
    
    renderSettings() {
        this.renderUserInfo();
        this.renderAccountSection();
        this.renderSecuritySection();
        this.renderPreferencesSection();
        this.renderNotificationsSection();
        this.renderPrivacySection();
        this.renderDataSection();
        this.renderAboutSection();
    }
    
    renderUserInfo() {
        const userName = DOM.get('userName');
        const userEmail = DOM.get('userEmail');
        
        if (userName) DOM.setText(userName, this.currentUser.fullName);
        if (userEmail) DOM.setText(userEmail, this.currentUser.email);
    }
    
    renderAccountSection() {
        // Personal information
        DOM.get('fullName').value = this.userSettings.account.fullName;
        DOM.get('email').value = this.userSettings.account.email;
        DOM.get('phone').value = this.userSettings.account.phone;
        DOM.get('timezone').value = this.userSettings.account.timezone;
        DOM.get('bio').value = this.userSettings.account.bio;
        
        // Profile picture
        const profilePicture = DOM.get('profilePicture');
        const profilePlaceholder = document.querySelector('.profile-placeholder');
        
        if (this.userSettings.account.profilePicture) {
            profilePicture.src = this.userSettings.account.profilePicture;
            profilePicture.classList.remove('hidden');
            profilePlaceholder.classList.add('hidden');
        } else {
            profilePicture.classList.add('hidden');
            profilePlaceholder.classList.remove('hidden');
        }
        
        // Wallet status
        this.renderWalletStatus();
    }
    
    renderWalletStatus() {
        const walletIndicator = DOM.get('walletIndicator');
        const walletLabel = DOM.get('walletLabel');
        const walletAddress = DOM.get('walletAddress');
        const walletBtn = DOM.get('walletBtn');
        
        if (this.currentUser.walletAddress) {
            walletIndicator.className = 'status-indicator connected';
            DOM.setText(walletLabel, 'Connected');
            DOM.setText(walletAddress, `${this.currentUser.walletAddress.slice(0, 6)}...${this.currentUser.walletAddress.slice(-4)}`);
            walletBtn.innerHTML = '<i class="fas fa-unlink"></i> Disconnect Wallet';
        } else {
            walletIndicator.className = 'status-indicator disconnected';
            DOM.setText(walletLabel, 'Not Connected');
            DOM.setText(walletAddress, 'No wallet connected');
            walletBtn.innerHTML = '<i class="fas fa-wallet"></i> Connect Wallet';
        }
    }
    
    renderSecuritySection() {
        DOM.get('smsAuth').checked = this.userSettings.security.smsAuth;
        DOM.get('emailAuth').checked = this.userSettings.security.emailAuth;
    }
    
    renderPreferencesSection() {
        // Theme selection
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.checked = input.value === this.userSettings.preferences.theme;
        });
        
        // Other preferences
        DOM.get('currency').value = this.userSettings.preferences.currency;
        DOM.get('dateFormat').value = this.userSettings.preferences.dateFormat;
        DOM.get('budgetCycle').value = this.userSettings.preferences.budgetCycle;
        DOM.get('startOfWeek').value = this.userSettings.preferences.startOfWeek;
        DOM.get('showQuickStats').checked = this.userSettings.preferences.showQuickStats;
        DOM.get('animatedCharts').checked = this.userSettings.preferences.animatedCharts;
        DOM.get('autoRefresh').checked = this.userSettings.preferences.autoRefresh;
    }
    
    renderNotificationsSection() {
        DOM.get('budgetAlerts').checked = this.userSettings.notifications.budgetAlerts;
        DOM.get('weeklyReports').checked = this.userSettings.notifications.weeklyReports;
        DOM.get('goalAchievements').checked = this.userSettings.notifications.goalAchievements;
        DOM.get('securityAlerts').checked = this.userSettings.notifications.securityAlerts;
        DOM.get('transactionReminders').checked = this.userSettings.notifications.transactionReminders;
        DOM.get('aiInsights').checked = this.userSettings.notifications.aiInsights;
        DOM.get('quietHoursStart').value = this.userSettings.notifications.quietHoursStart;
        DOM.get('quietHoursEnd').value = this.userSettings.notifications.quietHoursEnd;
    }
    
    renderPrivacySection() {
        DOM.get('usageAnalytics').checked = this.userSettings.privacy.usageAnalytics;
        DOM.get('crashReports').checked = this.userSettings.privacy.crashReports;
        DOM.get('personalizedTips').checked = this.userSettings.privacy.personalizedTips;
        DOM.get('marketingComms').checked = this.userSettings.privacy.marketingComms;
        DOM.get('profileVisibility').value = this.userSettings.privacy.profileVisibility;
    }
    
    renderDataSection() {
        const transactions = Storage.getUserTransactions(this.currentUser.id);
        const categories = Storage.getCategories();
        const budgets = Storage.getUserBudgets(this.currentUser.id);
        
        DOM.setText('transactionCount', transactions.length);
        DOM.setText('categoryCount', categories.length);
        DOM.setText('budgetCount', budgets.length);
        
        // Calculate storage usage
        const storageSize = this.calculateStorageSize();
        DOM.setText('storageUsed', this.formatBytes(storageSize));
    }
    
    renderAboutSection() {
        // Version and app info is static in HTML
    }
    
    calculateStorageSize() {
        const data = {
            users: Storage.get(CONFIG.STORAGE_KEYS.USERS) || [],
            transactions: Storage.get(CONFIG.STORAGE_KEYS.TRANSACTIONS) || [],
            categories: Storage.get(CONFIG.STORAGE_KEYS.CATEGORIES) || [],
            budgets: Storage.get(CONFIG.STORAGE_KEYS.BUDGETS) || [],
            conversations: Storage.get(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS) || []
        };
        
        return new Blob([JSON.stringify(data)]).size;
    }
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Event Handlers
    switchSection(sectionId) {
        // Update navigation
        document.querySelectorAll('.settings-menu-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.section === sectionId);
        });
        
        // Update panels
        document.querySelectorAll('.settings-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${sectionId}-panel`);
        });
        
        this.currentSection = sectionId;
    }
    
    async handlePasswordChange() {
        const currentPassword = DOM.get('currentPassword').value;
        const newPassword = DOM.get('newPassword').value;
        const confirmPassword = DOM.get('confirmNewPassword').value;
        
        try {
            // Validate current password
            const hashedCurrentPassword = await PasswordUtils.hash(currentPassword);
            if (hashedCurrentPassword !== this.currentUser.password) {
                throw new Error('Current password is incorrect');
            }
            
            // Validate new password
            if (newPassword !== confirmPassword) {
                throw new Error('New passwords do not match');
            }
            
            const strength = PasswordUtils.checkStrength(newPassword);
            if (strength.score < 3) {
                throw new Error('New password is too weak');
            }
            
            // Update password
            const hashedNewPassword = await PasswordUtils.hash(newPassword);
            const updatedUser = Storage.updateUser(this.currentUser.id, {
                password: hashedNewPassword
            });
            
            Storage.setCurrentUser(updatedUser);
            this.currentUser = updatedUser;
            
            // Clear form
            DOM.clearForm('passwordForm');
            
            NotificationUtils.showMessage('Password updated successfully!', 'success');
            
        } catch (error) {
            NotificationUtils.showMessage(error.message, 'error');
        }
    }
    
    handleAccountDeletion() {
        const confirmation = DOM.get('deleteConfirmation').value;
        const password = DOM.get('deletePassword').value;
        
        if (confirmation !== 'DELETE') {
            NotificationUtils.showMessage('Please type "DELETE" to confirm', 'error');
            return;
        }
        
        // In a real app, you'd verify the password and delete the account
        // For this demo, we'll just show a message
        NotificationUtils.showMessage('Account deletion functionality would be implemented with backend integration', 'info');
        this.hideDeleteAccountModal();
    }
    
    async toggleWallet() {
        if (this.currentUser.walletAddress) {
            // Disconnect wallet
            const updatedUser = Storage.updateUser(this.currentUser.id, {
                walletAddress: null
            });
            
            Storage.setCurrentUser(updatedUser);
            this.currentUser = updatedUser;
            
            this.renderWalletStatus();
            NotificationUtils.showMessage('Wallet disconnected', 'success');
            
        } else {
            // Connect wallet
            const walletAddress = await MetaMask.connectWallet();
            if (walletAddress) {
                const updatedUser = Storage.updateUser(this.currentUser.id, {
                    walletAddress: walletAddress
                });
                
                Storage.setCurrentUser(updatedUser);
                this.currentUser = updatedUser;
                
                this.renderWalletStatus();
                NotificationUtils.showMessage('Wallet connected successfully!', 'success');
            }
        }
    }
    
    uploadProfilePicture() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    const imageUrl = e.target.result;
                    
                    // Update settings
                    this.userSettings.account.profilePicture = imageUrl;
                    
                    // Update user data
                    const updatedUser = Storage.updateUser(this.currentUser.id, {
                        profileImage: imageUrl
                    });
                    
                    Storage.setCurrentUser(updatedUser);
                    this.currentUser = updatedUser;
                    
                    // Re-render
                    this.renderAccountSection();
                    this.markAsChanged();
                    
                    NotificationUtils.showMessage('Profile picture updated!', 'success');
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    }
    
    removeProfilePicture() {
        this.userSettings.account.profilePicture = null;
        
        const updatedUser = Storage.updateUser(this.currentUser.id, {
            profileImage: null
        });
        
        Storage.setCurrentUser(updatedUser);
        this.currentUser = updatedUser;
        
        this.renderAccountSection();
        this.markAsChanged();
        
        NotificationUtils.showMessage('Profile picture removed!', 'success');
    }
    
    saveAllSettings() {
        // Save account information
        this.saveAccountSettings();
        
        // Save user settings
        this.saveSettings();
        
        NotificationUtils.showMessage('All settings saved successfully!', 'success');
        this.hasChanges = false;
    }
    
    saveAccountSettings() {
        const accountData = {
            fullName: DOM.get('fullName').value,
            email: DOM.get('email').value,
            phone: DOM.get('phone').value
        };
        
        const updatedUser = Storage.updateUser(this.currentUser.id, accountData);
        Storage.setCurrentUser(updatedUser);
        this.currentUser = updatedUser;
        
        // Update local settings
        this.userSettings.account = { ...this.userSettings.account, ...accountData };
    }
    
    saveSettings() {
        Storage.set(`userSettings_${this.currentUser.id}`, this.userSettings);
    }
    
    resetSettings() {
        if (confirm('Are you sure you want to reset all settings to default values?')) {
            this.userSettings = this.getDefaultSettings();
            this.renderSettings();
            this.saveSettings();
            
            NotificationUtils.showMessage('Settings reset to defaults!', 'success');
            this.hasChanges = false;
        }
    }
    
    markAsChanged() {
        this.hasChanges = true;
    }
    
    applyTheme(theme) {
        // In a real app, you'd implement theme switching
        NotificationUtils.showMessage(`Theme changed to ${theme}`, 'info');
    }
    
    // Data Management Functions
    exportAllData() {
        const allData = Storage.exportData();
        const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ai-finance-data-${DateUtils.format(new Date(), 'YYYY-MM-DD')}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        NotificationUtils.showMessage('Complete data exported successfully!', 'success');
    }
    
    exportTransactions() {
        const transactions = Storage.getUserTransactions(this.currentUser.id);
        const categories = Storage.getCategories();
        
        // Convert to CSV format
        const csvData = this.convertTransactionsToCSV(transactions, categories);
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `transactions-${DateUtils.format(new Date(), 'YYYY-MM-DD')}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        NotificationUtils.showMessage('Transactions exported successfully!', 'success');
    }
    
    convertTransactionsToCSV(transactions, categories) {
        const headers = ['Date', 'Type', 'Amount', 'Category', 'Description'];
        const rows = [headers.join(',')];
        
        transactions.forEach(transaction => {
            const category = categories.find(cat => cat.id === transaction.categoryId);
            const row = [
                DateUtils.format(transaction.date),
                transaction.type,
                transaction.amount,
                category?.name || 'Unknown',
                `"${transaction.description || ''}"`
            ];
            rows.push(row.join(','));
        });
        
        return rows.join('\n');
    }
    
    generateFinancialReport() {
        // Use the same report generation from AI advisor
        if (window.aiAdvisorManager) {
            window.aiAdvisorManager.generateReport();
        } else {
            NotificationUtils.showMessage('Please visit the AI Advisor page to generate reports', 'info');
        }
    }
    
    importTransactions() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const content = e.target.result;
                        let transactions = [];
                        
                        if (file.type === 'application/json') {
                            const data = JSON.parse(content);
                            transactions = data.transactions || data;
                        } else {
                            // CSV parsing would be implemented here
                            NotificationUtils.showMessage('CSV import coming soon!', 'info');
                            return;
                        }
                        
                        // Import transactions
                        let importedCount = 0;
                        transactions.forEach(transaction => {
                            const newTransaction = {
                                ...transaction,
                                id: StringUtils.generateUUID(),
                                userId: this.currentUser.id,
                                createdAt: DateUtils.now(),
                                updatedAt: DateUtils.now()
                            };
                            
                            Storage.createTransaction(newTransaction);
                            importedCount++;
                        });
                        
                        this.renderDataSection();
                        NotificationUtils.showMessage(`Imported ${importedCount} transactions successfully!`, 'success');
                        
                    } catch (error) {
                        NotificationUtils.showMessage('Failed to import transactions. Please check the file format.', 'error');
                    }
                };
                reader.readAsText(file);
            }
        };
        input.click();
    }
    
    clearCacheData() {
        // Clear temporary data
        localStorage.removeItem('tempData');
        sessionStorage.clear();
        
        NotificationUtils.showMessage('Cache cleared successfully!', 'success');
    }
    
    showDeleteAccountModal() {
        DOM.show('deleteAccountModal');
    }
    
    hideDeleteAccountModal() {
        DOM.hide('deleteAccountModal');
        DOM.clearForm('deleteAccountForm');
    }
    
    showClearDataModal() {
        DOM.show('clearDataModal');
    }
    
    hideClearDataModal() {
        DOM.hide('clearDataModal');
    }
    
    confirmClearData() {
        const clearTransactions = DOM.get('clearTransactions').checked;
        const clearBudgets = DOM.get('clearBudgets').checked;
        const clearCategories = DOM.get('clearCategories').checked;
        const clearConversations = DOM.get('clearConversations').checked;
        
        try {
            if (clearTransactions) {
                const currentTransactions = Storage.get(CONFIG.STORAGE_KEYS.TRANSACTIONS) || [];
                const filteredTransactions = currentTransactions.filter(t => t.userId !== this.currentUser.id);
                Storage.set(CONFIG.STORAGE_KEYS.TRANSACTIONS, filteredTransactions);
            }
            
            if (clearBudgets) {
                const currentBudgets = Storage.get(CONFIG.STORAGE_KEYS.BUDGETS) || [];
                const filteredBudgets = currentBudgets.filter(b => b.userId !== this.currentUser.id);
                Storage.set(CONFIG.STORAGE_KEYS.BUDGETS, filteredBudgets);
            }
            
            if (clearCategories) {
                Storage.set(CONFIG.STORAGE_KEYS.CATEGORIES, CONFIG.DEFAULT_CATEGORIES);
            }
            
            if (clearConversations) {
                const currentConversations = Storage.get(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS) || [];
                const filteredConversations = currentConversations.filter(c => c.userId !== this.currentUser.id);
                Storage.set(CONFIG.STORAGE_KEYS.AI_CONVERSATIONS, filteredConversations);
            }
            
            this.renderDataSection();
            this.hideClearDataModal();
            
            NotificationUtils.showMessage('Selected data cleared successfully!', 'success');
            
        } catch (error) {
            NotificationUtils.showMessage('Failed to clear data', 'error');
        }
    }
}

// Global functions for HTML onclick handlers
window.switchSection = (sectionId) => {
    if (window.settingsManager) {
        window.settingsManager.switchSection(sectionId);
    }
};

window.saveAllSettings = () => {
    if (window.settingsManager) {
        window.settingsManager.saveAllSettings();
    }
};

window.resetSettings = () => {
    if (window.settingsManager) {
        window.settingsManager.resetSettings();
    }
};

window.toggleWallet = () => {
    if (window.settingsManager) {
        window.settingsManager.toggleWallet();
    }
};

window.uploadProfilePicture = () => {
    if (window.settingsManager) {
        window.settingsManager.uploadProfilePicture();
    }
};

window.removeProfilePicture = () => {
    if (window.settingsManager) {
        window.settingsManager.removeProfilePicture();
    }
};

window.exportAllData = () => {
    if (window.settingsManager) {
        window.settingsManager.exportAllData();
    }
};

window.exportTransactions = () => {
    if (window.settingsManager) {
        window.settingsManager.exportTransactions();
    }
};

window.generateFinancialReport = () => {
    if (window.settingsManager) {
        window.settingsManager.generateFinancialReport();
    }
};

window.importTransactions = () => {
    if (window.settingsManager) {
        window.settingsManager.importTransactions();
    }
};

window.clearCacheData = () => {
    if (window.settingsManager) {
        window.settingsManager.clearCacheData();
    }
};

window.showDeleteAccountModal = () => {
    if (window.settingsManager) {
        window.settingsManager.showDeleteAccountModal();
    }
};

window.hideDeleteAccountModal = () => {
    if (window.settingsManager) {
        window.settingsManager.hideDeleteAccountModal();
    }
};

window.showClearDataModal = () => {
    if (window.settingsManager) {
        window.settingsManager.showClearDataModal();
    }
};

window.hideClearDataModal = () => {
    if (window.settingsManager) {
        window.settingsManager.hideClearDataModal();
    }
};

window.confirmClearData = () => {
    if (window.settingsManager) {
        window.settingsManager.confirmClearData();
    }
};

// Initialize settings manager when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.settingsManager = new SettingsManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SettingsManager };
}