// Authentication System

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.init();
    }
    
    init() {
        this.currentUser = Storage.getCurrentUser();
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Sign up form
        const signupForm = DOM.get('signupForm');
        if (signupForm) {
            this.setupSignupForm(signupForm);
        }
        
        // Sign in form
        const signinForm = DOM.get('signinForm');
        if (signinForm) {
            this.setupSigninForm(signinForm);
        }
        
        // Forgot password forms
        this.setupForgotPasswordForms();
        
        // Password strength checker
        this.setupPasswordStrengthChecker();
        
        // OTP input handler
        setupOTPInput();
    }
    
    setupSignupForm(form) {
        const validator = setupFormValidation('signupForm', {
            fullName: [
                { test: ValidationRules.required, message: 'Full name is required' },
                { test: ValidationRules.minLength(2), message: 'Name must be at least 2 characters' }
            ],
            email: [
                { test: ValidationRules.required, message: 'Email is required' },
                { test: ValidationRules.email, message: 'Please enter a valid email' }
            ],
            phone: [
                { test: ValidationRules.required, message: 'Phone number is required' },
                { test: ValidationRules.phone, message: 'Please enter a valid phone number' }
            ],
            password: [
                { test: ValidationRules.required, message: 'Password is required' },
                { test: ValidationRules.password, message: 'Password must be at least 8 characters' }
            ],
            confirmPassword: [
                { test: ValidationRules.required, message: 'Please confirm your password' }
            ],
            walletAddress: [
                { test: ValidationRules.walletAddress, message: 'Please enter a valid wallet address' }
            ]
        });
        
        form.addEventListener('validationSuccess', async (e) => {
            const { data } = e.detail;
            await this.handleSignup(data);
        });
    }
    
    setupSigninForm(form) {
        const validator = setupFormValidation('signinForm', {
            email: [
                { test: ValidationRules.required, message: 'Email is required' },
                { test: ValidationRules.email, message: 'Please enter a valid email' }
            ],
            password: [
                { test: ValidationRules.required, message: 'Password is required' }
            ]
        });
        
        form.addEventListener('validationSuccess', async (e) => {
            const { data } = e.detail;
            await this.handleSignin(data);
        });
    }
    
    setupForgotPasswordForms() {
        // Email form
        const emailForm = DOM.get('emailForm');
        if (emailForm) {
            emailForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = DOM.get('email').value;
                await this.handleForgotPassword(email);
            });
        }
        
        // OTP form
        const otpForm = DOM.get('otpForm');
        if (otpForm) {
            otpForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const otp = getOTPValue();
                await this.handleOTPVerification(otp);
            });
        }
        
        // Password reset form
        const passwordForm = DOM.get('passwordForm');
        if (passwordForm) {
            passwordForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const newPassword = DOM.get('newPassword').value;
                const confirmPassword = DOM.get('confirmNewPassword').value;
                await this.handlePasswordReset(newPassword, confirmPassword);
            });
        }
        
        // Resend OTP
        const resendBtn = DOM.get('resendBtn');
        if (resendBtn) {
            resendBtn.addEventListener('click', () => {
                this.handleResendOTP();
            });
        }
    }
    
    setupPasswordStrengthChecker() {
        const passwordField = DOM.get('password');
        const strengthDisplay = DOM.get('passwordStrength');
        
        if (passwordField && strengthDisplay) {
            setupPasswordStrengthChecker('password', 'passwordStrength');
        }
        
        // Confirm password validation
        setupConfirmPasswordValidation('password', 'confirmPassword');
        setupConfirmPasswordValidation('newPassword', 'confirmNewPassword');
    }
    
    async handleSignup(data) {
        const submitBtn = DOM.get('signupBtn');
        NotificationUtils.showLoading(submitBtn, 'Creating Account...');
        
        try {
            // Check if user already exists
            const existingUser = Storage.getUserByEmail(data.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }
            
            // Check wallet address if provided
            if (data.walletAddress) {
                const existingWallet = Storage.getUserByWallet(data.walletAddress);
                if (existingWallet) {
                    throw new Error('This wallet address is already registered');
                }
            }
            
            // Hash password
            const hashedPassword = await PasswordUtils.hash(data.password);
            
            // Create user
            const userData = {
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                password: hashedPassword,
                walletAddress: data.walletAddress || null,
                profileImage: null,
                isEmailVerified: false,
                isPhoneVerified: false,
                preferences: {
                    currency: CONFIG.CURRENCY.CODE,
                    notifications: true,
                    theme: 'light'
                }
            };
            
            const newUser = Storage.createUser(userData);
            
            // Set current user
            Storage.setCurrentUser(newUser);
            this.currentUser = newUser;
            
            NotificationUtils.showMessage('Account created successfully!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = CONFIG.ROUTES.DASHBOARD;
            }, 1500);
            
        } catch (error) {
            NotificationUtils.showMessage(error.message, 'error');
        } finally {
            NotificationUtils.hideLoading(submitBtn);
        }
    }
    
    async handleSignin(data) {
        const submitBtn = DOM.get('signinBtn');
        NotificationUtils.showLoading(submitBtn, 'Signing In...');
        
        try {
            // Find user
            const user = Storage.getUserByEmail(data.email);
            if (!user) {
                throw new Error('No account found with this email');
            }
            
            // Verify password
            const hashedPassword = await PasswordUtils.hash(data.password);
            if (user.password !== hashedPassword) {
                throw new Error('Invalid password');
            }
            
            // Set current user
            Storage.setCurrentUser(user);
            this.currentUser = user;
            
            NotificationUtils.showMessage('Sign in successful!', 'success');
            
            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = CONFIG.ROUTES.DASHBOARD;
            }, 1500);
            
        } catch (error) {
            NotificationUtils.showMessage(error.message, 'error');
        } finally {
            NotificationUtils.hideLoading(submitBtn);
        }
    }
    
    async handleForgotPassword(email) {
        const submitBtn = DOM.get('sendCodeBtn');
        NotificationUtils.showLoading(submitBtn, 'Sending Code...');
        
        try {
            // Check if user exists
            const user = Storage.getUserByEmail(email);
            if (!user) {
                throw new Error('No account found with this email');
            }
            
            // Generate OTP
            const otp = this.generateOTP();
            
            // Save OTP
            Storage.saveOTP(email, otp);
            
            // Simulate sending email (in real app, you'd use an email service)
            await this.simulateEmailSend(email, otp);
            
            // Show OTP step
            DOM.hide('emailStep');
            DOM.show('otpStep');
            
            // Focus first OTP input
            const firstOtpInput = DOM.get('otp1');
            if (firstOtpInput) firstOtpInput.focus();
            
            // Start resend countdown
            this.startResendCountdown();
            
            NotificationUtils.showMessage('Verification code sent to your email', 'success');
            
        } catch (error) {
            NotificationUtils.showMessage(error.message, 'error');
        } finally {
            NotificationUtils.hideLoading(submitBtn);
        }
    }
    
    async handleOTPVerification(otp) {
        const submitBtn = DOM.get('verifyCodeBtn');
        NotificationUtils.showLoading(submitBtn, 'Verifying...');
        
        try {
            const email = DOM.get('email').value;
            const savedOTP = Storage.getOTP(email);
            
            if (!savedOTP) {
                throw new Error('OTP expired. Please request a new one.');
            }
            
            // Check if OTP is expired
            if (DateUtils.now() > savedOTP.expiresAt) {
                Storage.removeOTP(email);
                throw new Error('OTP expired. Please request a new one.');
            }
            
            // Verify OTP
            if (otp !== savedOTP.code) {
                throw new Error('Invalid verification code');
            }
            
            // Show password reset step
            DOM.hide('otpStep');
            DOM.show('passwordStep');
            
            // Focus password field
            const passwordField = DOM.get('newPassword');
            if (passwordField) passwordField.focus();
            
            NotificationUtils.showMessage('Code verified successfully!', 'success');
            
        } catch (error) {
            NotificationUtils.showMessage(error.message, 'error');
        } finally {
            NotificationUtils.hideLoading(submitBtn);
        }
    }
    
    async handlePasswordReset(newPassword, confirmPassword) {
        const submitBtn = DOM.get('resetPasswordBtn');
        NotificationUtils.showLoading(submitBtn, 'Resetting Password...');
        
        try {
            // Validate passwords match
            if (newPassword !== confirmPassword) {
                throw new Error('Passwords do not match');
            }
            
            // Validate password strength
            const strength = PasswordUtils.checkStrength(newPassword);
            if (strength.score < 3) {
                throw new Error('Password is too weak. Please choose a stronger password.');
            }
            
            const email = DOM.get('email').value;
            const user = Storage.getUserByEmail(email);
            
            if (!user) {
                throw new Error('User not found');
            }
            
            // Hash new password
            const hashedPassword = await PasswordUtils.hash(newPassword);
            
            // Update user password
            Storage.updateUser(user.id, { password: hashedPassword });
            
            // Remove OTP
            Storage.removeOTP(email);
            
            // Show success step
            DOM.hide('passwordStep');
            DOM.show('successStep');
            
            NotificationUtils.showMessage('Password reset successfully!', 'success');
            
        } catch (error) {
            NotificationUtils.showMessage(error.message, 'error');
        } finally {
            NotificationUtils.hideLoading(submitBtn);
        }
    }
    
    handleResendOTP() {
        const email = DOM.get('email').value;
        this.handleForgotPassword(email);
    }
    
    generateOTP() {
        const length = CONFIG.OTP.LENGTH;
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += Math.floor(Math.random() * 10);
        }
        return otp;
    }
    
    async simulateEmailSend(email, otp) {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // In development, log OTP to console
        if (ENV.DEVELOPMENT) {
            console.log(`OTP for ${email}: ${otp}`);
        }
        
        // In real app, integrate with email service like SendGrid, AWS SES, etc.
    }
    
    startResendCountdown() {
        const countdownElement = DOM.get('countdown');
        const resendBtn = DOM.get('resendBtn');
        
        if (!countdownElement || !resendBtn) return;
        
        let countdown = CONFIG.OTP.RESEND_COOLDOWN;
        resendBtn.disabled = true;
        
        const timer = setInterval(() => {
            countdownElement.textContent = `Resend code in ${countdown}s`;
            countdown--;
            
            if (countdown < 0) {
                clearInterval(timer);
                countdownElement.textContent = '';
                resendBtn.disabled = false;
            }
        }, 1000);
    }
    
    logout() {
        Storage.clearCurrentUser();
        this.currentUser = null;
        window.location.href = CONFIG.ROUTES.SIGNIN;
    }
    
    isAuthenticated() {
        return this.currentUser !== null;
    }
    
    getCurrentUser() {
        return this.currentUser;
    }
    
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = CONFIG.ROUTES.SIGNIN;
            return false;
        }
        return true;
    }
}

// Create global auth instance
const Auth = new AuthManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthManager, Auth };
}