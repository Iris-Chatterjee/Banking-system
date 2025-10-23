// Bank Management System - Frontend JavaScript

// Global variables
let currentUser = null;
let currentSection = 'overview';

// API Base URL
const API_BASE_URL = 'https://banking-system-eight-kohl.vercel.app/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is already logged in
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showDashboard();
    }

    // Set up event listeners
    setupEventListeners();
});

// Set up all event listeners
function setupEventListeners() {
    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // Register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // Transfer form
    const transferForm = document.getElementById('transferForm');
    if (transferForm) {
        transferForm.addEventListener('submit', handleTransfer);
    }

    // Deposit form
    const depositForm = document.getElementById('depositForm');
    if (depositForm) {
        depositForm.addEventListener('submit', handleDeposit);
    }

    // Withdraw form
    const withdrawForm = document.getElementById('withdrawForm');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', handleWithdraw);
    }

    // Profile form
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }

    // Transaction filter
    const transactionFilter = document.getElementById('transactionFilter');
    if (transactionFilter) {
        transactionFilter.addEventListener('change', filterTransactions);
    }

    // Date filter
    const dateFilter = document.getElementById('dateFilter');
    if (dateFilter) {
        dateFilter.addEventListener('change', filterTransactions);
    }
}

// Page navigation functions
function showLoginPage() {
    hideAllPages();
    document.getElementById('loginPage').classList.add('active');
}

function showRegisterPage() {
    hideAllPages();
    document.getElementById('registerPage').classList.add('active');
}

function showDashboard() {
    hideAllPages();
    document.getElementById('dashboardPage').classList.add('active');
    
    if (currentUser) {
        document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.firstName}`;
        loadDashboardData();
    }
}

function hideAllPages() {
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => page.classList.remove('active'));
}

// Section navigation
function showSection(sectionName) {
    // Update navigation
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => link.classList.remove('active'));
    event.target.classList.add('active');

    // Show section
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    document.getElementById(sectionName + 'Section').classList.add('active');

    currentSection = sectionName;

    // Load section-specific data
    switch(sectionName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'accounts':
            loadAccountsData();
            break;
        case 'transactions':
            loadTransactionsData();
            break;
        case 'profile':
            loadProfileData();
            break;
    }
}

// Authentication functions
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        accountNumber: formData.get('accountNumber'),
        password: formData.get('password')
    };

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(loginData)
        });

        const result = await response.json();
        
        if (response.ok) {
            // --- FIX IS HERE ---
            // Assign the user object from the response
            currentUser = result.user;
            // Attach the separate token property to your currentUser object
            currentUser.token = result.token;

            // Now, save the complete object (with the token) to localStorage
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            // --- END OF FIX ---

            showSuccessMessage('Login successful!');
            setTimeout(() => {
                showDashboard();
            }, 1000);
        } else {
            showErrorMessage(result.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showErrorMessage('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    
    // Validate passwords match
    if (formData.get('regPassword') !== formData.get('confirmPassword')) {
        showErrorMessage('Passwords do not match');
        return;
    }

    const registerData = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        address: formData.get('address'),
        accountType: formData.get('accountType'),
        initialDeposit: parseFloat(formData.get('initialDeposit')),
        password: formData.get('regPassword')
    };

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showSuccessMessage(`Account created successfully! Your account number is: ${result.accountNumber}`);
            setTimeout(() => {
                showLoginPage();
            }, 3000);
        } else {
            showErrorMessage(result.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showErrorMessage('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    showLoginPage();
}

// Dashboard data loading functions
async function loadDashboardData() {
    await Promise.all([
        loadOverviewData(),
        loadAccountsData()
    ]);
}

async function loadOverviewData() {
    if (!currentUser) return;

    try {
        // Load current balance
        const balanceResponse = await fetch(`${API_BASE_URL}/accounts/${currentUser.accountNumber}/balance`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });

        if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            document.getElementById('currentBalance').textContent = `$${parseFloat(balanceData.balance).toFixed(2)}`;
        }

        // Display account number (masked)
        const accountNumber = currentUser.accountNumber;
        const maskedAccount = '****' + accountNumber.slice(-4);
        document.getElementById('displayAccountNumber').textContent = maskedAccount;

        // Load recent transactions
        await loadRecentTransactions();

    } catch (error) {
        console.error('Error loading overview data:', error);
    }
}

async function loadRecentTransactions() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/transactions/${currentUser.accountNumber}?limit=5`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });

        if (response.ok) {
            const transactions = await response.json();
            displayRecentTransactions(transactions);
        }
    } catch (error) {
        console.error('Error loading recent transactions:', error);
    }
}

function displayRecentTransactions(transactions) {
    const container = document.getElementById('recentTransactionsList');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>No recent transactions</p>';
        return;
    }

    const transactionsHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-details">
                <h4>${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</h4>
                <p>${transaction.description || 'No description'}</p>
                <p>${new Date(transaction.date).toLocaleDateString()}</p>
            </div>
            <div class="transaction-amount ${transaction.type === 'deposit' ? 'credit' : 'debit'}">
                ${transaction.type === 'deposit' ? '+' : '-'}$${transaction.amount.toFixed(2)}
            </div>
        </div>
    `).join('');

    container.innerHTML = transactionsHTML;
}

async function loadAccountsData() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/accounts/${currentUser.accountNumber}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });

        if (response.ok) {
            const accountData = await response.json();
            displayAccountInfo(accountData);
        }
    } catch (error) {
        console.error('Error loading account data:', error);
    }
}

function displayAccountInfo(account) {
    const container = document.getElementById('accountsList');
    
    const accountHTML = `
        <div class="account-item">
            <div class="account-header">
                <div class="account-type">${account.account_type} Account</div>
                <div class="account-balance">$${parseFloat(account.balance).toFixed(2)}</div>
            </div>
            <div class="account-details">
                <p><strong>Account Number:</strong> ${account.account_number}</p>
                <p><strong>Account Holder:</strong> ${account.first_name} ${account.last_name}</p>
                <p><strong>Account Type:</strong> ${account.account_type}</p>
                <p><strong>Status:</strong> ${account.status || 'Active'}</p>
                <p><strong>Created:</strong> ${new Date(account.created_at).toLocaleDateString()}</p>
            </div>
        </div>
    `;
    
    container.innerHTML = accountHTML;
}

async function loadTransactionsData() {
    if (!currentUser) return;

    try {
        const response = await fetch(`${API_BASE_URL}/transactions/${currentUser.accountNumber}`, {
            headers: {
                'Authorization': `Bearer ${currentUser.token}`
            }
        });

        if (response.ok) {
            const transactions = await response.json();
            displayTransactions(transactions);
        }
    } catch (error) {
        console.error('Error loading transactions:', error);
    }
}

function displayTransactions(transactions) {
    const container = document.getElementById('transactionsList');
    
    if (transactions.length === 0) {
        container.innerHTML = '<p>No transactions found</p>';
        return;
    }

    const transactionsHTML = transactions.map(transaction => `
        <div class="transaction-item">
            <div class="transaction-details">
                <h4>${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</h4>
                <p>${transaction.description || 'No description'}</p>
                <p>${new Date(transaction.date).toLocaleDateString()} ${new Date(transaction.date).toLocaleTimeString()}</p>
                ${transaction.recipient_account ? `<p>To: ${transaction.recipient_account}</p>` : ''}
            </div>
            <div class="transaction-amount ${transaction.type === 'deposit' ? 'credit' : 'debit'}">
                
                ${transaction.type === 'deposit' ? '+' : '-'}$${parseFloat(transaction.amount).toFixed(2)}
            </div>
        </div>
    `).join('');

    container.innerHTML = transactionsHTML;
}

function loadProfileData() {
    if (!currentUser) return;

    // Populate profile form with current user data
    document.getElementById('profileFirstName').value = currentUser.firstName || '';
    document.getElementById('profileLastName').value = currentUser.lastName || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profilePhone').value = currentUser.phone || '';
    document.getElementById('profileAddress').value = currentUser.address || '';
}

// Transaction functions
async function handleTransfer(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const transferData = {
        fromAccount: currentUser.accountNumber,
        toAccount: formData.get('recipientAccount'),
        amount: parseFloat(formData.get('transferAmount')),
        description: formData.get('transferDescription') || 'Money Transfer'
    };

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/transactions/transfer`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(transferData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showSuccessMessage('Transfer completed successfully!');
            e.target.reset();
            loadOverviewData(); // Refresh balance
        } else {
            showErrorMessage(result.message || 'Transfer failed');
        }
    } catch (error) {
        console.error('Transfer error:', error);
        showErrorMessage('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleDeposit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const depositData = {
        accountNumber: currentUser.accountNumber,
        amount: parseFloat(formData.get('depositAmount')),
        description: formData.get('depositDescription') || 'Cash Deposit'
    };

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/transactions/deposit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(depositData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showSuccessMessage('Deposit completed successfully!');
            e.target.reset();
            closeModal('depositModal');
            loadOverviewData(); // Refresh balance
        } else {
            showErrorMessage(result.message || 'Deposit failed');
        }
    } catch (error) {
        console.error('Deposit error:', error);
        showErrorMessage('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleWithdraw(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const withdrawData = {
        accountNumber: currentUser.accountNumber,
        amount: parseFloat(formData.get('withdrawAmount')),
        description: formData.get('withdrawDescription') || 'Cash Withdrawal'
    };

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/transactions/withdraw`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(withdrawData)
        });

        const result = await response.json();
        
        if (response.ok) {
            showSuccessMessage('Withdrawal completed successfully!');
            e.target.reset();
            closeModal('withdrawModal');
            loadOverviewData(); // Refresh balance
        } else {
            showErrorMessage(result.message || 'Withdrawal failed');
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        showErrorMessage('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const profileData = {
        firstName: formData.get('profileFirstName'),
        lastName: formData.get('profileLastName'),
        email: formData.get('profileEmail'),
        phone: formData.get('profilePhone'),
        address: formData.get('profileAddress')
    };

    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.accountNumber}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentUser.token}`
            },
            body: JSON.stringify(profileData)
        });

        const result = await response.json();
        
        if (response.ok) {
            // Update current user data
            currentUser = { ...currentUser, ...profileData };
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showSuccessMessage('Profile updated successfully!');
        } else {
            showErrorMessage(result.message || 'Profile update failed');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showErrorMessage('Network error. Please try again.');
    } finally {
        hideLoading();
    }
}


// Modal functions
function showDepositModal() {
    document.getElementById('depositModal').style.display = 'block';
}

function showCustomerInfoModal() {
    document.getElementById('customerInfoModal').style.display = 'block';
    loadAllCustomerData(); // Fetch data only when the modal is opened
}

function showWithdrawModal() {
    document.getElementById('withdrawModal').style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Filter transactions
function filterTransactions() {
    const filterType = document.getElementById('transactionFilter').value;
    const filterDate = document.getElementById('dateFilter').value;
    
    // This would typically filter the displayed transactions
    // For now, we'll reload the transactions with filters
    loadTransactionsData();
}

// Utility functions
function showLoading() {
    document.body.classList.add('loading');
}

function hideLoading() {
    document.body.classList.remove('loading');
}

function showSuccessMessage(message) {
    // Remove existing messages
    removeMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'success-message fade-in';
    messageDiv.textContent = message;
    
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function showErrorMessage(message) {
    // Remove existing messages
    removeMessages();
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'error-message fade-in';
    messageDiv.textContent = message;
    
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 5000);
}

function removeMessages() {
    const messages = document.querySelectorAll('.success-message, .error-message');
    messages.forEach(message => message.remove());
}

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Validate account number format
function validateAccountNumber(accountNumber) {
    return /^\\d{10,12}$/.test(accountNumber);
}

async function loadAllCustomerData() {
    // Target the tbody inside the new modal
    const customerListBody = document.getElementById('customerListModal');
    customerListBody.innerHTML = '<tr><td colspan="5">Loading customer data...</td></tr>';

    try {
        const response = await fetch(`${API_BASE_URL}/users`);

        if (!response.ok) {
            throw new Error('Failed to fetch customer data.');
        }

        const customers = await response.json();

        if (customers.length === 0) {
            customerListBody.innerHTML = '<tr><td colspan="5">No customers found.</td></tr>';
            return;
        }

        const customersHTML = customers.map(customer => `
            <tr>
                <td>${customer.first_name} ${customer.last_name}</td>
                <td>${customer.account_number}</td>
                <td>${customer.email}</td>
                <td>${customer.phone}</td>
                <td>${customer.address}</td>
            </tr>
        `).join('');

        customerListBody.innerHTML = customersHTML;

    } catch (error) {
        console.error('Error loading customer data:', error);
        customerListBody.innerHTML = `<tr><td colspan="5" style="color: red;">Error loading data. Please check the console.</td></tr>`;
    }
}


// Close modals when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}