// Form Validation Utilities

class Validator {
    constructor() {
        this.rules = {};
        this.messages = {};
        this.errors = {};
    }
    
    // Add validation rule
    addRule(field, rule, message) {
        if (!this.rules[field]) {
            this.rules[field] = [];
        }
        this.rules[field].push(rule);
        this.messages[`${field}.${rule.name}`] = message;
    }
    
    // Validate single field
    validateField(field, value) {
        const rules = this.rules[field];
        if (!rules) return true;
        
        for (let rule of rules) {
            if (!rule.test(value)) {
                this.errors[field] = this.messages[`${field}.${rule.name}`];
                return false;
            }
        }
        
        delete this.errors[field];
        return true;
    }
    
    // Validate all fields
    validate(data) {
        this.errors = {};
        let isValid = true;
        
        for (let field in this.rules) {
            if (!this.validateField(field, data[field])) {
                isValid = false;
            }
        }
        
        return isValid;
    }
    
    // Get error for field
    getError(field) {
        return this.errors[field] || null;
    }
    
    // Get all errors
    getErrors() {
        return this.errors;
    }
    
    // Clear errors
    clearErrors() {
        this.errors = {};
    }
}

// Common validation rules
const ValidationRules = {
    // Required field
    required: (value) => {
        return value !== null && value !== undefined && value.toString().trim() !== '';
    },
    
    // Email validation
    email: (value) => {
        return CONFIG.VALIDATION.EMAIL_PATTERN.test(value);
    },
    
    // Phone validation
    phone: (value) => {
        return CONFIG.VALIDATION.PHONE_PATTERN.test(value);
    },
    
    // Password strength
    password: (value) => {
        return value && value.length >= CONFIG.VALIDATION.PASSWORD_MIN_LENGTH;
    },
    
    // Name validation
    name: (value) => {
        return value && value.length >= CONFIG.VALIDATION.NAME_MIN_LENGTH;
    },
    
    // Wallet address validation
    walletAddress: (value) => {
        return !value || CONFIG.VALIDATION.WALLET_ADDRESS_PATTERN.test(value);
    },
    
    // Numeric validation
    numeric: (value) => {
        return !isNaN(value) && !isNaN(parseFloat(value));
    },
    
    // Positive number
    positive: (value) => {
        return parseFloat(value) > 0;
    },
    
    // URL validation
    url: (value) => {
        try {
            new URL(value);
            return true;
        } catch {
            return false;
        }
    },
    
    // Date validation
    date: (value) => {
        return !isNaN(Date.parse(value));
    },
    
    // Minimum length
    minLength: (min) => (value) => {
        return value && value.length >= min;
    },
    
    // Maximum length
    maxLength: (max) => (value) => {
        return !value || value.length <= max;
    },
    
    // Match field
    match: (matchField) => (value, data) => {
        return value === data[matchField];
    },
    
    // Custom regex
    regex: (pattern) => (value) => {
        return pattern.test(value);
    }
};

// Form validator setup
function setupFormValidation(formId, validationRules) {
    const form = DOM.get(formId);
    if (!form) return;
    
    const validator = new Validator();
    
    // Add validation rules
    for (let field in validationRules) {
        const rules = validationRules[field];
        for (let rule of rules) {
            validator.addRule(field, rule.test, rule.message);
        }
    }
    
    // Real-time validation
    form.addEventListener('input', (e) => {
        const field = e.target;
        const fieldName = field.name || field.id;
        const value = field.value;
        
        if (validator.rules[fieldName]) {
            const isValid = validator.validateField(fieldName, value);
            updateFieldValidation(field, isValid, validator.getError(fieldName));
        }
    });
    
    // Form submission validation
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {};
        
        // Collect form data
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        // Get data from individual fields (for cases where FormData might miss some)
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            const name = input.name || input.id;
            if (name) {
                data[name] = input.value;
            }
        });
        
        // Validate form
        const isValid = validator.validate(data);
        
        if (isValid) {
            // Clear all error displays
            clearAllErrors(form);
            
            // Trigger custom validation event
            form.dispatchEvent(new CustomEvent('validationSuccess', {
                detail: { data, validator }
            }));
        } else {
            // Show all errors
            const errors = validator.getErrors();
            for (let field in errors) {
                const fieldElement = form.querySelector(`[name="${field}"], #${field}`);
                if (fieldElement) {
                    updateFieldValidation(fieldElement, false, errors[field]);
                }
            }
            
            // Focus first error field
            const firstErrorField = form.querySelector('.error');
            if (firstErrorField) {
                firstErrorField.focus();
            }
        }
    });
    
    return validator;
}

// Update field validation display
function updateFieldValidation(field, isValid, errorMessage) {
    const errorElement = DOM.get(field.id + 'Error') || 
                        field.parentNode.querySelector('.form-error');
    
    if (isValid) {
        DOM.removeClass(field, 'error');
        if (errorElement) {
            errorElement.textContent = '';
            DOM.hide(errorElement);
        }
    } else {
        DOM.addClass(field, 'error');
        if (errorElement) {
            errorElement.textContent = errorMessage;
            DOM.show(errorElement);
        }
    }
}

// Clear all errors in form
function clearAllErrors(form) {
    const errorFields = form.querySelectorAll('.error');
    errorFields.forEach(field => {
        DOM.removeClass(field, 'error');
    });
    
    const errorMessages = form.querySelectorAll('.form-error');
    errorMessages.forEach(error => {
        error.textContent = '';
        DOM.hide(error);
    });
}

// Password strength checker
function checkPasswordStrength(password, displayElement) {
    const strength = PasswordUtils.checkStrength(password);
    const element = typeof displayElement === 'string' ? DOM.get(displayElement) : displayElement;
    
    if (!element) return strength;
    
    const colors = {
        0: '#ef4444',
        1: '#f97316',
        2: '#eab308',
        3: '#22c55e',
        4: '#22c55e',
        5: '#16a34a'
    };
    
    element.innerHTML = `
        <div class="password-strength-bar">
            <div class="strength-bar" style="width: ${(strength.score / 5) * 100}%; background-color: ${colors[strength.score]}"></div>
        </div>
        <div class="strength-text" style="color: ${colors[strength.score]}">
            ${strength.level}
        </div>
        ${strength.feedback.length > 0 ? `
            <div class="strength-feedback">
                <small>Missing: ${strength.feedback.join(', ')}</small>
            </div>
        ` : ''}
    `;
    
    return strength;
}

// Real-time password strength checking
function setupPasswordStrengthChecker(passwordFieldId, displayElementId) {
    const passwordField = DOM.get(passwordFieldId);
    const displayElement = DOM.get(displayElementId);
    
    if (!passwordField || !displayElement) return;
    
    passwordField.addEventListener('input', debounce((e) => {
        const password = e.target.value;
        if (password) {
            checkPasswordStrength(password, displayElement);
            DOM.show(displayElement);
        } else {
            DOM.hide(displayElement);
        }
    }, 300));
}

// Confirm password validation
function setupConfirmPasswordValidation(passwordFieldId, confirmPasswordFieldId) {
    const passwordField = DOM.get(passwordFieldId);
    const confirmPasswordField = DOM.get(confirmPasswordFieldId);
    
    if (!passwordField || !confirmPasswordField) return;
    
    const validateMatch = () => {
        const password = passwordField.value;
        const confirmPassword = confirmPasswordField.value;
        
        if (confirmPassword && password !== confirmPassword) {
            updateFieldValidation(confirmPasswordField, false, 'Passwords do not match');
            return false;
        } else if (confirmPassword) {
            updateFieldValidation(confirmPasswordField, true, '');
            return true;
        }
        return true;
    };
    
    confirmPasswordField.addEventListener('input', validateMatch);
    passwordField.addEventListener('input', validateMatch);
}

// OTP input management
function setupOTPInput() {
    const otpInputs = document.querySelectorAll('.otp-input');
    
    otpInputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d*$/.test(value)) {
                e.target.value = value.replace(/\D/g, '');
                return;
            }
            
            // Move to next input
            if (value && index < otpInputs.length - 1) {
                otpInputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Move to previous input on backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                otpInputs[index - 1].focus();
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = e.clipboardData.getData('text');
            const digits = paste.replace(/\D/g, '').split('');
            
            digits.forEach((digit, i) => {
                if (index + i < otpInputs.length) {
                    otpInputs[index + i].value = digit;
                }
            });
            
            // Focus next empty input or last input
            const nextEmpty = Array.from(otpInputs).find(input => !input.value);
            if (nextEmpty) {
                nextEmpty.focus();
            } else {
                otpInputs[otpInputs.length - 1].focus();
            }
        });
    });
}

// Get OTP value
function getOTPValue() {
    const otpInputs = document.querySelectorAll('.otp-input');
    return Array.from(otpInputs).map(input => input.value).join('');
}

// Clear OTP inputs
function clearOTPInputs() {
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach(input => {
        input.value = '';
    });
    if (otpInputs.length > 0) {
        otpInputs[0].focus();
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Validator,
        ValidationRules,
        setupFormValidation,
        updateFieldValidation,
        clearAllErrors,
        checkPasswordStrength,
        setupPasswordStrengthChecker,
        setupConfirmPasswordValidation,
        setupOTPInput,
        getOTPValue,
        clearOTPInputs
    };
}