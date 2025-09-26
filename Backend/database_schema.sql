-- Create database
CREATE DATABASE IF NOT EXISTS bank_management;
USE bank_management;

-- Users table - stores customer information
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(12) UNIQUE NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(15) NOT NULL,
    address TEXT NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE,
    ssn VARCHAR(11),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_account_number (account_number),
    INDEX idx_email (email)
);

-- Accounts table - stores account details
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(12) UNIQUE NOT NULL,
    user_id INT NOT NULL,
    account_type ENUM('savings', 'current', 'fixed') NOT NULL DEFAULT 'savings',
    balance DECIMAL(15, 2) DEFAULT 0.00,
    minimum_balance DECIMAL(15, 2) DEFAULT 0.00,
    interest_rate DECIMAL(5, 4) DEFAULT 0.0000,
    status ENUM('active', 'inactive', 'suspended', 'closed') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE,
    INDEX idx_account_number (account_number),
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
);

-- Transactions table - stores all transaction history
CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(20) UNIQUE NOT NULL,
    account_number VARCHAR(12) NOT NULL,
    transaction_type ENUM('deposit', 'withdrawal', 'transfer') NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    recipient_account VARCHAR(12) NULL,
    description TEXT,
    balance_before DECIMAL(15, 2) NOT NULL,
    balance_after DECIMAL(15, 2) NOT NULL,
    transaction_fee DECIMAL(10, 2) DEFAULT 0.00,
    status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'completed',
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_by VARCHAR(50) DEFAULT 'SYSTEM',
    
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE,
    INDEX idx_account_number (account_number),
    INDEX idx_transaction_type (transaction_type),
    INDEX idx_transaction_date (transaction_date),
    INDEX idx_status (status),
    INDEX idx_recipient_account (recipient_account)
);

-- Cards table - stores debit/credit card information
CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    card_number VARCHAR(16) UNIQUE NOT NULL,
    account_number VARCHAR(12) NOT NULL,
    card_type ENUM('debit', 'credit') NOT NULL DEFAULT 'debit',
    card_holder_name VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    cvv_hash VARCHAR(255) NOT NULL,
    daily_limit DECIMAL(10, 2) DEFAULT 5000.00,
    monthly_limit DECIMAL(12, 2) DEFAULT 50000.00,
    status ENUM('active', 'inactive', 'blocked', 'expired') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE,
    INDEX idx_card_number (card_number),
    INDEX idx_account_number (account_number),
    INDEX idx_status (status)
);

-- Loans table - stores loan information
CREATE TABLE IF NOT EXISTS loans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    loan_id VARCHAR(15) UNIQUE NOT NULL,
    account_number VARCHAR(12) NOT NULL,
    loan_type ENUM('personal', 'home', 'car', 'education', 'business') NOT NULL,
    loan_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 4) NOT NULL,
    tenure_months INT NOT NULL,
    monthly_payment DECIMAL(10, 2) NOT NULL,
    outstanding_amount DECIMAL(15, 2) NOT NULL,
    status ENUM('applied', 'approved', 'active', 'completed', 'defaulted') DEFAULT 'applied',
    application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    approval_date TIMESTAMP NULL,
    completion_date TIMESTAMP NULL,
    
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE,
    INDEX idx_loan_id (loan_id),
    INDEX idx_account_number (account_number),
    INDEX idx_status (status)
);

-- Fixed deposits table - stores fixed deposit information
CREATE TABLE IF NOT EXISTS fixed_deposits (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fd_number VARCHAR(15) UNIQUE NOT NULL,
    account_number VARCHAR(12) NOT NULL,
    principal_amount DECIMAL(15, 2) NOT NULL,
    interest_rate DECIMAL(5, 4) NOT NULL,
    tenure_months INT NOT NULL,
    maturity_amount DECIMAL(15, 2) NOT NULL,
    maturity_date DATE NOT NULL,
    status ENUM('active', 'matured', 'premature_closure') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    matured_at TIMESTAMP NULL,
    
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE,
    INDEX idx_fd_number (fd_number),
    INDEX idx_account_number (account_number),
    INDEX idx_maturity_date (maturity_date),
    INDEX idx_status (status)
);

-- Beneficiaries table - stores saved beneficiaries for transfers
CREATE TABLE IF NOT EXISTS beneficiaries (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(12) NOT NULL,
    beneficiary_account VARCHAR(12) NOT NULL,
    beneficiary_name VARCHAR(100) NOT NULL,
    beneficiary_bank VARCHAR(100) NOT NULL,
    nickname VARCHAR(50),
    is_favorite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE,
    INDEX idx_account_number (account_number),
    INDEX idx_beneficiary_account (beneficiary_account)
);

-- Session management table - for user session tracking
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(12) NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    login_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE,
    INDEX idx_account_number (account_number),
    INDEX idx_session_token (session_token),
    INDEX idx_is_active (is_active)
);

-- Admin users table - for bank staff/admin access
CREATE TABLE IF NOT EXISTS admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'manager', 'teller', 'support') NOT NULL DEFAULT 'teller',
    permissions JSON,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_is_active (is_active)
);

-- Audit log table - for tracking all system changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_number VARCHAR(12),
    admin_user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE SET NULL,
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE SET NULL,
    INDEX idx_account_number (account_number),
    INDEX idx_admin_user_id (admin_user_id),
    INDEX idx_action (action),
    INDEX idx_timestamp (timestamp)
);

-- Insert sample data (for testing purposes)
-- Note: In production, this should be done through proper registration process

INSERT INTO users (account_number, first_name, last_name, email, phone, address, password_hash) VALUES
('1000000001', 'John', 'Doe', 'john.doe@email.com', '1234567890', '123 Main St, City, State 12345', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYyIBp2Ny7NYBDi'), -- password: password123
('1000000002', 'Jane', 'Smith', 'jane.smith@email.com', '9876543210', '456 Oak Ave, City, State 67890', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYyIBp2Ny7NYBDi'); -- password: password123

INSERT INTO accounts (account_number, user_id, account_type, balance) VALUES
('1000000001', 1, 'savings', 5000.00),
('1000000002', 2, 'current', 10000.00);

INSERT INTO transactions (transaction_id, account_number, transaction_type, amount, description, balance_before, balance_after) VALUES
('TXN1000000001', '1000000001', 'deposit', 5000.00, 'Initial deposit', 0.00, 5000.00),
('TXN1000000002', '1000000002', 'deposit', 10000.00, 'Initial deposit', 0.00, 10000.00);

INSERT INTO admin_users (username, full_name, email, password_hash, role) VALUES
('admin', 'System Administrator', 'admin@bank.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYyIBp2Ny7NYBDi', 'admin'), -- password: admin123
('manager', 'Bank Manager', 'manager@bank.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewYyIBp2Ny7NYBDi', 'manager'); -- password: admin123

-- Create indexes for better performance
CREATE INDEX idx_transactions_date_range ON transactions(account_number, transaction_date);
CREATE INDEX idx_transactions_type_status ON transactions(transaction_type, status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_accounts_balance ON accounts(balance);

-- Create views for common queries
CREATE VIEW account_summary AS
SELECT 
    u.account_number,
    CONCAT(u.first_name, ' ', u.last_name) as full_name,
    u.email,
    u.phone,
    a.account_type,
    a.balance,
    a.status,
    a.created_at
FROM users u
JOIN accounts a ON u.account_number = a.account_number;

CREATE VIEW transaction_summary AS
SELECT 
    t.transaction_id,
    t.account_number,
    CONCAT(u.first_name, ' ', u.last_name) as account_holder,
    t.transaction_type,
    t.amount,
    t.recipient_account,
    t.description,
    t.balance_after,
    t.transaction_date,
    t.status
FROM transactions t
JOIN users u ON t.account_number = u.account_number
ORDER BY t.transaction_date DESC;

-- Stored procedures for common operations
DELIMITER //

CREATE PROCEDURE GetAccountBalance(IN acc_num VARCHAR(12))
BEGIN
    SELECT balance FROM accounts WHERE account_number = acc_num AND status = 'active';
END //

CREATE PROCEDURE GetTransactionHistory(
    IN acc_num VARCHAR(12),
    IN limit_count INT,
    IN offset_count INT
)
BEGIN
    SELECT 
        transaction_id,
        transaction_type,
        amount,
        recipient_account,
        description,
        balance_after,
        transaction_date,
        status
    FROM transactions 
    WHERE account_number = acc_num 
    ORDER BY transaction_date DESC
    LIMIT limit_count OFFSET offset_count;
END //

DELIMITER ;

-- Triggers for audit logging
DELIMITER //

CREATE TRIGGER user_audit_trigger
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
    INSERT INTO audit_logs (account_number, action, table_name, record_id, old_values, new_values)
    VALUES (
        NEW.account_number,
        'UPDATE',
        'users',
        NEW.id,
        JSON_OBJECT(
            'first_name', OLD.first_name,
            'last_name', OLD.last_name,
            'email', OLD.email,
            'phone', OLD.phone,
            'address', OLD.address
        ),
        JSON_OBJECT(
            'first_name', NEW.first_name,
            'last_name', NEW.last_name,
            'email', NEW.email,
            'phone', NEW.phone,
            'address', NEW.address
        )
    );
END //

CREATE TRIGGER balance_update_trigger
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
    IF OLD.balance != NEW.balance THEN
        INSERT INTO audit_logs (account_number, action, table_name, record_id, old_values, new_values)
        VALUES (
            NEW.account_number,
            'BALANCE_UPDATE',
            'accounts',
            NEW.id,
            JSON_OBJECT('balance', OLD.balance),
            JSON_OBJECT('balance', NEW.balance)
        );
    END IF;
END //

DELIMITER ;


print("Database schema created successfully!")