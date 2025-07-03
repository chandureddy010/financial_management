// MetaMask Integration

class MetaMaskManager {
    constructor() {
        this.isMetaMaskInstalled = false;
        this.currentAccount = null;
        this.init();
    }
    
    init() {
        this.checkMetaMaskInstalled();
        this.setupEventListeners();
    }
    
    checkMetaMaskInstalled() {
        this.isMetaMaskInstalled = typeof window.ethereum !== 'undefined' && window.ethereum.isMetaMask;
        return this.isMetaMaskInstalled;
    }
    
    setupEventListeners() {
        if (this.isMetaMaskInstalled) {
            window.ethereum.on('accountsChanged', (accounts) => {
                this.handleAccountsChanged(accounts);
            });
            
            window.ethereum.on('chainChanged', (chainId) => {
                this.handleChainChanged(chainId);
            });
        }
    }
    
    async connectWallet() {
        if (!this.isMetaMaskInstalled) {
            NotificationUtils.showMessage('MetaMask is not installed. Please install it to continue.', 'error');
            this.showMetaMaskInstallPrompt();
            return null;
        }
        
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            if (accounts.length > 0) {
                this.currentAccount = accounts[0];
                NotificationUtils.showMessage('Wallet connected successfully!', 'success');
                return this.currentAccount;
            }
            
        } catch (error) {
            console.error('Error connecting wallet:', error);
            NotificationUtils.showMessage('Failed to connect wallet. Please try again.', 'error');
            return null;
        }
    }
    
    async signupWithMetaMask() {
        const walletAddress = await this.connectWallet();
        
        if (!walletAddress) return;
        
        try {
            // Check if wallet is already registered
            const existingUser = Storage.getUserByWallet(walletAddress);
            if (existingUser) {
                NotificationUtils.showMessage('This wallet is already registered. Please sign in instead.', 'warning');
                return;
            }
            
            // Get wallet balance and info
            const balance = await this.getWalletBalance(walletAddress);
            const network = await this.getNetworkInfo();
            
            // Create minimal user data
            const userData = {
                fullName: `User ${walletAddress.slice(0, 6)}`,
                email: `${walletAddress}@metamask.local`,
                phone: '',
                password: await PasswordUtils.hash(walletAddress + Date.now()),
                walletAddress: walletAddress,
                profileImage: null,
                isEmailVerified: false,
                isPhoneVerified: false,
                walletInfo: {
                    balance: balance,
                    network: network
                },
                preferences: {
                    currency: CONFIG.CURRENCY.CODE,
                    notifications: true,
                    theme: 'light'
                }
            };
            
            const newUser = Storage.createUser(userData);
            Storage.setCurrentUser(newUser);
            
            NotificationUtils.showMessage('Account created with MetaMask!', 'success');
            
            setTimeout(() => {
                window.location.href = CONFIG.ROUTES.DASHBOARD;
            }, 1500);
            
        } catch (error) {
            console.error('MetaMask signup error:', error);
            NotificationUtils.showMessage('Failed to create account with MetaMask', 'error');
        }
    }
    
    async signinWithMetaMask() {
        const walletAddress = await this.connectWallet();
        
        if (!walletAddress) return;
        
        try {
            // Find user by wallet address
            const user = Storage.getUserByWallet(walletAddress);
            if (!user) {
                NotificationUtils.showMessage('No account found with this wallet. Please sign up first.', 'warning');
                return;
            }
            
            // Update wallet info
            const balance = await this.getWalletBalance(walletAddress);
            const network = await this.getNetworkInfo();
            
            const updatedUser = Storage.updateUser(user.id, {
                walletInfo: {
                    balance: balance,
                    network: network
                }
            });
            
            Storage.setCurrentUser(updatedUser);
            
            NotificationUtils.showMessage('Signed in with MetaMask!', 'success');
            
            setTimeout(() => {
                window.location.href = CONFIG.ROUTES.DASHBOARD;
            }, 1500);
            
        } catch (error) {
            console.error('MetaMask signin error:', error);
            NotificationUtils.showMessage('Failed to sign in with MetaMask', 'error');
        }
    }
    
    async getWalletBalance(address) {
        if (!this.isMetaMaskInstalled) return '0';
        
        try {
            const balance = await window.ethereum.request({
                method: 'eth_getBalance',
                params: [address, 'latest']
            });
            
            // Convert from wei to ETH
            const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
            return ethBalance.toFixed(4);
            
        } catch (error) {
            console.error('Error getting balance:', error);
            return '0';
        }
    }
    
    async getNetworkInfo() {
        if (!this.isMetaMaskInstalled) return null;
        
        try {
            const chainId = await window.ethereum.request({
                method: 'eth_chainId'
            });
            
            const networkNames = {
                '0x1': 'Ethereum Mainnet',
                '0x3': 'Ropsten Testnet',
                '0x4': 'Rinkeby Testnet',
                '0x5': 'Goerli Testnet',
                '0x2a': 'Kovan Testnet',
                '0x38': 'Binance Smart Chain',
                '0x89': 'Polygon Mainnet'
            };
            
            return {
                chainId: chainId,
                name: networkNames[chainId] || 'Unknown Network'
            };
            
        } catch (error) {
            console.error('Error getting network info:', error);
            return null;
        }
    }
    
    async signMessage(message) {
        if (!this.isMetaMaskInstalled || !this.currentAccount) return null;
        
        try {
            const signature = await window.ethereum.request({
                method: 'personal_sign',
                params: [message, this.currentAccount]
            });
            
            return signature;
            
        } catch (error) {
            console.error('Error signing message:', error);
            return null;
        }
    }
    
    async sendTransaction(to, amount) {
        if (!this.isMetaMaskInstalled || !this.currentAccount) return null;
        
        try {
            const transactionParameters = {
                to: to,
                from: this.currentAccount,
                value: (amount * Math.pow(10, 18)).toString(16), // Convert ETH to wei
            };
            
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters]
            });
            
            return txHash;
            
        } catch (error) {
            console.error('Error sending transaction:', error);
            return null;
        }
    }
    
    handleAccountsChanged(accounts) {
        if (accounts.length === 0) {
            // User disconnected wallet
            this.currentAccount = null;
            NotificationUtils.showMessage('Wallet disconnected', 'info');
        } else if (accounts[0] !== this.currentAccount) {
            // User switched accounts
            this.currentAccount = accounts[0];
            NotificationUtils.showMessage('Wallet account changed', 'info');
        }
    }
    
    handleChainChanged(chainId) {
        // Reload page when chain changes
        window.location.reload();
    }
    
    showMetaMaskInstallPrompt() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fab fa-ethereum"></i> MetaMask Required</h3>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p>MetaMask is required to use wallet features. Please install MetaMask to continue.</p>
                    <div class="install-steps">
                        <div class="step">
                            <div class="step-number">1</div>
                            <div class="step-content">
                                <h4>Install MetaMask</h4>
                                <p>Download and install MetaMask browser extension</p>
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-number">2</div>
                            <div class="step-content">
                                <h4>Create Wallet</h4>
                                <p>Set up your wallet and secure your seed phrase</p>
                            </div>
                        </div>
                        <div class="step">
                            <div class="step-number">3</div>
                            <div class="step-content">
                                <h4>Connect</h4>
                                <p>Return here and connect your wallet</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-primary" onclick="window.open('https://metamask.io/download/', '_blank')">
                        <i class="fab fa-chrome"></i> Install MetaMask
                    </button>
                    <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }
    
    disconnect() {
        this.currentAccount = null;
        NotificationUtils.showMessage('Wallet disconnected', 'info');
    }
    
    isConnected() {
        return this.currentAccount !== null;
    }
    
    getCurrentAccount() {
        return this.currentAccount;
    }
}

// Create global MetaMask instance
const MetaMask = new MetaMaskManager();

// Global functions for HTML onclick handlers
window.connectMetamask = () => MetaMask.connectWallet();
window.signupWithMetamask = () => MetaMask.signupWithMetaMask();
window.signinWithMetamask = () => MetaMask.signinWithMetaMask();
window.connectWallet = () => MetaMask.connectWallet();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MetaMaskManager, MetaMask };
}