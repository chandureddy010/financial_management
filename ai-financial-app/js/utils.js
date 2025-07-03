// Utility Functions

// DOM Manipulation Utilities
const DOM = {
    // Get element by ID
    get: (id) => document.getElementById(id),
    
    // Get elements by class name
    getByClass: (className) => document.getElementsByClassName(className),
    
    // Get elements by selector
    select: (selector) => document.querySelector(selector),
    
    // Get all elements by selector
    selectAll: (selector) => document.querySelectorAll(selector),
    
    // Show element
    show: (element) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) element.classList.remove('hidden');
    },
    
    // Hide element
    hide: (element) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) element.classList.add('hidden');
    },
    
    // Toggle element visibility
    toggle: (element) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) element.classList.toggle('hidden');
    },
    
    // Add class
    addClass: (element, className) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) element.classList.add(className);
    },
    
    // Remove class
    removeClass: (element, className) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) element.classList.remove(className);
    },
    
    // Set text content
    setText: (element, text) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) element.textContent = text;
    },
    
    // Set HTML content
    setHTML: (element, html) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) element.innerHTML = html;
    },
    
    // Get form data
    getFormData: (formId) => {
        const form = DOM.get(formId);
        if (!form) return {};
        
        const formData = new FormData(form);
        const data = {};
        
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        return data;
    },
    
    // Clear form
    clearForm: (formId) => {
        const form = DOM.get(formId);
        if (form) form.reset();
    }
};

// Date and Time Utilities
const DateUtils = {
    // Format date
    format: (date, format = 'MM/DD/YYYY') => {
        if (!date) return '';
        
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        
        return format
            .replace('MM', month)
            .replace('DD', day)
            .replace('YYYY', year);
    },
    
    // Get relative time
    getRelativeTime: (date) => {
        const now = new Date();
        const diff = now - new Date(date);
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
        if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        return 'Just now';
    },
    
    // Get current timestamp
    now: () => new Date().getTime(),
    
    // Format timestamp
    formatTimestamp: (timestamp) => {
        return new Date(timestamp).toLocaleString();
    }
};

// Number and Currency Utilities
const NumberUtils = {
    // Format currency
    formatCurrency: (amount, currency = CONFIG.CURRENCY) => {
        return new Intl.NumberFormat(currency.LOCALE, {
            style: 'currency',
            currency: currency.CODE
        }).format(amount);
    },
    
    // Format number
    formatNumber: (number, decimals = 2) => {
        return Number(number).toFixed(decimals);
    },
    
    // Parse currency string to number
    parseCurrency: (currencyString) => {
        return parseFloat(currencyString.replace(/[^0-9.-]+/g, ''));
    },
    
    // Generate random number
    random: (min, max) => {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },
    
    // Calculate percentage
    percentage: (value, total) => {
        return total === 0 ? 0 : (value / total) * 100;
    }
};

// String Utilities
const StringUtils = {
    // Capitalize first letter
    capitalize: (str) => {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },
    
    // Convert to title case
    toTitleCase: (str) => {
        return str.replace(/\w\S*/g, (txt) => 
            txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    },
    
    // Generate random string
    randomString: (length) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },
    
    // Generate UUID
    generateUUID: () => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    // Truncate string
    truncate: (str, length = 50) => {
        return str.length > length ? str.substring(0, length) + '...' : str;
    }
};

// Array Utilities
const ArrayUtils = {
    // Remove duplicates
    unique: (arr) => [...new Set(arr)],
    
    // Shuffle array
    shuffle: (arr) => {
        const shuffled = [...arr];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    },
    
    // Group by property
    groupBy: (arr, key) => {
        return arr.reduce((groups, item) => {
            const value = item[key];
            if (!groups[value]) {
                groups[value] = [];
            }
            groups[value].push(item);
            return groups;
        }, {});
    },
    
    // Sort by property
    sortBy: (arr, key, direction = 'asc') => {
        return [...arr].sort((a, b) => {
            if (direction === 'asc') {
                return a[key] > b[key] ? 1 : -1;
            } else {
                return a[key] < b[key] ? 1 : -1;
            }
        });
    }
};

// Notification Utilities
const NotificationUtils = {
    // Show message
    showMessage: (message, type = 'info', duration = 5000) => {
        const container = DOM.get('message-container') || document.body;
        
        const messageEl = document.createElement('div');
        messageEl.className = `message ${type} animate-fadeIn`;
        messageEl.innerHTML = `
            <i class="${NotificationUtils.getIcon(type)}"></i>
            <span>${message}</span>
            <button class="close-btn" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(messageEl);
        
        // Auto remove after duration
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, duration);
    },
    
    // Get icon for message type
    getIcon: (type) => {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    },
    
    // Show loading
    showLoading: (element, text = 'Loading...') => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) {
            DOM.addClass(element, 'loading');
            element.disabled = true;
            element.originalText = element.textContent;
            element.innerHTML = `<i class="spinner"></i> ${text}`;
        }
    },
    
    // Hide loading
    hideLoading: (element) => {
        if (typeof element === 'string') element = DOM.get(element);
        if (element) {
            DOM.removeClass(element, 'loading');
            element.disabled = false;
            element.textContent = element.originalText || 'Submit';
        }
    }
};

// Local Storage Utilities
const StorageUtils = {
    // Set item
    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Storage set error:', error);
            return false;
        }
    },
    
    // Get item
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error('Storage get error:', error);
            return null;
        }
    },
    
    // Remove item
    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Storage remove error:', error);
            return false;
        }
    },
    
    // Clear all
    clear: () => {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Storage clear error:', error);
            return false;
        }
    }
};

// Password Utilities
const PasswordUtils = {
    // Generate random password
    generate: (length = 12) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    },
    
    // Check password strength
    checkStrength: (password) => {
        let score = 0;
        let feedback = [];
        
        if (password.length >= 8) score += 1;
        else feedback.push('At least 8 characters');
        
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('Lowercase letter');
        
        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('Uppercase letter');
        
        if (/[0-9]/.test(password)) score += 1;
        else feedback.push('Number');
        
        if (/[^A-Za-z0-9]/.test(password)) score += 1;
        else feedback.push('Special character');
        
        const levels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
        return {
            score,
            level: levels[score] || 'Very Weak',
            feedback
        };
    },
    
    // Hash password (simple implementation)
    hash: async (password) => {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
};

// Toggle password visibility
function togglePassword(fieldId) {
    const field = DOM.get(fieldId);
    const button = field.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (field.type === 'password') {
        field.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        field.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

// Debounce function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Export utilities for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DOM,
        DateUtils,
        NumberUtils,
        StringUtils,
        ArrayUtils,
        NotificationUtils,
        StorageUtils,
        PasswordUtils,
        togglePassword,
        debounce,
        throttle
    };
}