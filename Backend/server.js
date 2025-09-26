const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'bank_management',
    port: process.env.DB_PORT || 5432,
});

// Initialize database connection + create tables
async function initializeDatabase() {
    let client;
    try {
        client = await pool.connect();
        console.log('Connected to PostgreSQL database');
        await createTables(client);
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    } finally {
        if (client) client.release();
    }
}

// Create database tables and trigger for auto-updating timestamps
async function createTables(client) {
    const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            account_number VARCHAR(20) UNIQUE NOT NULL,
            first_name VARCHAR(50) NOT NULL,
            last_name VARCHAR(50) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(15) NOT NULL,
            address TEXT NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        )
    `;

    const createAccountsTable = `
        CREATE TABLE IF NOT EXISTS accounts (
            id SERIAL PRIMARY KEY,
            account_number VARCHAR(20) UNIQUE NOT NULL,
            user_id INT NOT NULL,
            account_type VARCHAR(20) NOT NULL,
            balance DECIMAL(15, 2) DEFAULT 0.00,
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE
        )
    `;

    const createTransactionsTable = `
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            account_number VARCHAR(20) NOT NULL,
            transaction_type VARCHAR(20) NOT NULL,
            amount DECIMAL(15, 2) NOT NULL,
            recipient_account VARCHAR(20) NULL,
            description TEXT,
            balance_after DECIMAL(15, 2) NOT NULL,
            transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (account_number) REFERENCES users(account_number) ON DELETE CASCADE
        )
    `;

    // Trigger function to automatically update the 'updated_at' column
    const createUpdateTimestampTriggerFunction = `
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
           NEW.updated_at = NOW(); 
           RETURN NEW;
        END;
        $$ language 'plpgsql';
    `;

    // Triggers for users and accounts tables
    const createUsersUpdateTrigger = `
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
        BEFORE UPDATE ON users
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
    `;

    const createAccountsUpdateTrigger = `
        DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
        CREATE TRIGGER update_accounts_updated_at
        BEFORE UPDATE ON accounts
        FOR EACH ROW
        EXECUTE PROCEDURE update_updated_at_column();
    `;

    try {
        await client.query(createUsersTable);
        await client.query(createAccountsTable);
        await client.query(createTransactionsTable);
        await client.query(createUpdateTimestampTriggerFunction);
        await client.query(createUsersUpdateTrigger);
        await client.query(createAccountsUpdateTrigger);
        console.log('Database tables and triggers created successfully');
    } catch (error) {
        console.error('Error creating tables:', error);
    }
}

// JWT middleware for authentication
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'bank_secret_key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
}

// Generate unique account number
function generateAccountNumber() {
    // Generates a 16-digit number
    return Date.now().toString() + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
}

// --- Routes ---

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Bank Management System API is running' });
});

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
    const {
        firstName, lastName, email, phone, address,
        accountType, initialDeposit, password
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName || !email || !phone || !address || !accountType || !initialDeposit || !password) {
        return res.status(400).json({ message: 'All fields are required' });
    }
    
    // Use a single client for the entire transaction
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Check if user already exists
        const existingUserResult = await client.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ message: 'User with this email already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);
        const accountNumber = generateAccountNumber();

        // Create user and get the new user's ID
        const userInsertQuery = `
            INSERT INTO users (account_number, first_name, last_name, email, phone, address, password_hash) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
        `;
        const userResult = await client.query(userInsertQuery, [accountNumber, firstName, lastName, email, phone, address, passwordHash]);
        const userId = userResult.rows[0].id;

        // Create account
        const accountInsertQuery = `
            INSERT INTO accounts (account_number, user_id, account_type, balance) 
            VALUES ($1, $2, $3, $4)
        `;
        await client.query(accountInsertQuery, [accountNumber, userId, accountType, initialDeposit]);

        // Create initial deposit transaction
        const transactionInsertQuery = `
            INSERT INTO transactions (account_number, transaction_type, amount, description, balance_after) 
            VALUES ($1, 'deposit', $2, 'Initial deposit', $3)
        `;
        await client.query(transactionInsertQuery, [accountNumber, initialDeposit, initialDeposit]);

        await client.query('COMMIT');

        res.status(201).json({
            message: 'Account created successfully',
            accountNumber: accountNumber
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    } finally {
        client.release();
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { accountNumber, password } = req.body;

        if (!accountNumber || !password) {
            return res.status(400).json({ message: 'Account number and password are required' });
        }

        const query = `
            SELECT u.*, a.balance, a.account_type, a.status 
            FROM users u 
            JOIN accounts a ON u.account_number = a.account_number 
            WHERE u.account_number = $1
        `;
        const result = await pool.query(query, [accountNumber]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];

        if (user.status !== 'active') {
            return res.status(401).json({ message: 'Account is suspended or inactive' });
        }

        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { accountNumber: user.account_number, userId: user.id, email: user.email },
            process.env.JWT_SECRET || 'bank_secret_key',
            { expiresIn: '24h' }
        );

        delete user.password_hash; // Remove sensitive data

        res.json({
            message: 'Login successful',
            token: token,
            user: {
                accountNumber: user.account_number,
                firstName: user.first_name,
                lastName: user.last_name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                accountType: user.account_type,
                balance: user.balance,
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Account routes
app.get('/api/accounts/:accountNumber', authenticateToken, async (req, res) => {
    try {
        const { accountNumber } = req.params;

        if (req.user.accountNumber !== accountNumber) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const query = `
            SELECT u.first_name, u.last_name, u.email, u.phone, u.address, 
                   a.account_number, a.account_type, a.balance, a.status, a.created_at
            FROM users u 
            JOIN accounts a ON u.account_number = a.account_number 
            WHERE a.account_number = $1
        `;
        const result = await pool.query(query, [accountNumber]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json(result.rows[0]);

    } catch (error) {
        console.error('Get account error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/accounts/:accountNumber/balance', authenticateToken, async (req, res) => {
    try {
        const { accountNumber } = req.params;
        
        if (req.user.accountNumber !== accountNumber) {
            return res.status(403).json({ message: 'Access denied' });
        }

        const result = await pool.query('SELECT balance FROM accounts WHERE account_number = $1', [accountNumber]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Account not found' });
        }

        res.json({ balance: result.rows[0].balance });

    } catch (error) {
        console.error('Get balance error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Transaction routes
app.post('/api/transactions/deposit', authenticateToken, async (req, res) => {
    const { accountNumber, amount, description } = req.body;
    
    if (req.user.accountNumber !== accountNumber) {
        return res.status(403).json({ message: 'Access denied' });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const accountResult = await client.query('SELECT balance FROM accounts WHERE account_number = $1 FOR UPDATE', [accountNumber]);
        if (accountResult.rows.length === 0) {
            throw new Error('Account not found');
        }

        const currentBalance = parseFloat(accountResult.rows[0].balance);
        const newBalance = currentBalance + parseFloat(amount);

        await client.query('UPDATE accounts SET balance = $1 WHERE account_number = $2', [newBalance, accountNumber]);
        
        const transactionQuery = `
            INSERT INTO transactions (account_number, transaction_type, amount, description, balance_after) 
            VALUES ($1, 'deposit', $2, $3, $4)
        `;
        await client.query(transactionQuery, [accountNumber, amount, description || 'Cash Deposit', newBalance]);

        await client.query('COMMIT');
        
        res.json({
            message: 'Deposit successful',
            newBalance: newBalance,
            transactionAmount: amount
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Deposit error:', error);
        res.status(500).json({ message: 'Transaction failed' });
    } finally {
        client.release();
    }
});

app.post('/api/transactions/withdraw', authenticateToken, async (req, res) => {
    const { accountNumber, amount, description } = req.body;

    if (req.user.accountNumber !== accountNumber) {
        return res.status(403).json({ message: 'Access denied' });
    }
    if (!amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid amount is required' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const accountResult = await client.query('SELECT balance FROM accounts WHERE account_number = $1 FOR UPDATE', [accountNumber]);
        if (accountResult.rows.length === 0) {
            throw new Error('Account not found');
        }

        const currentBalance = parseFloat(accountResult.rows[0].balance);
        if (currentBalance < parseFloat(amount)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Insufficient funds' });
        }

        const newBalance = currentBalance - parseFloat(amount);
        
        await client.query('UPDATE accounts SET balance = $1 WHERE account_number = $2', [newBalance, accountNumber]);
        
        const transactionQuery = `
            INSERT INTO transactions (account_number, transaction_type, amount, description, balance_after) 
            VALUES ($1, 'withdrawal', $2, $3, $4)
        `;
        await client.query(transactionQuery, [accountNumber, amount, description || 'Cash Withdrawal', newBalance]);

        await client.query('COMMIT');
        
        res.json({
            message: 'Withdrawal successful',
            newBalance: newBalance,
            transactionAmount: amount
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Withdrawal error:', error);
        res.status(500).json({ message: 'Transaction failed' });
    } finally {
        client.release();
    }
});

app.post('/api/transactions/transfer', authenticateToken, async (req, res) => {
    const { fromAccount, toAccount, amount, description } = req.body;

    if (req.user.accountNumber !== fromAccount) {
        return res.status(403).json({ message: 'Access denied' });
    }
    if (!toAccount || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Valid recipient account and amount are required' });
    }
    if (fromAccount === toAccount) {
        return res.status(400).json({ message: 'Cannot transfer to the same account' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Check recipient account
        const recipientResult = await client.query("SELECT balance FROM accounts WHERE account_number = $1 AND status = 'active'", [toAccount]);
        if (recipientResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Recipient account not found or inactive' });
        }
        
        // Lock sender's account row for update
        const senderResult = await client.query('SELECT balance FROM accounts WHERE account_number = $1 FOR UPDATE', [fromAccount]);
        if (senderResult.rows.length === 0) {
            throw new Error('Sender account not found');
        }

        const senderBalance = parseFloat(senderResult.rows[0].balance);
        if (senderBalance < parseFloat(amount)) {
            await client.query('ROLLBACK');
            return res.status(400).json({ message: 'Insufficient funds' });
        }
        
        // Lock recipient's account row for update
        const recipientBalanceResult = await client.query('SELECT balance FROM accounts WHERE account_number = $1 FOR UPDATE', [toAccount]);
        const recipientBalance = parseFloat(recipientBalanceResult.rows[0].balance);
        
        const newSenderBalance = senderBalance - parseFloat(amount);
        const newRecipientBalance = recipientBalance + parseFloat(amount);
        
        // Update balances
        await client.query('UPDATE accounts SET balance = $1 WHERE account_number = $2', [newSenderBalance, fromAccount]);
        await client.query('UPDATE accounts SET balance = $1 WHERE account_number = $2', [newRecipientBalance, toAccount]);
        
        // Log transactions for both sender and recipient
        const senderTxQuery = `
            INSERT INTO transactions (account_number, transaction_type, amount, recipient_account, description, balance_after) 
            VALUES ($1, 'transfer', $2, $3, $4, $5)
        `;
        await client.query(senderTxQuery, [fromAccount, amount, toAccount, description || 'Money Transfer', newSenderBalance]);

        const recipientTxQuery = `
            INSERT INTO transactions (account_number, transaction_type, amount, recipient_account, description, balance_after) 
            VALUES ($1, 'deposit', $2, $3, $4, $5)
        `;
        await client.query(recipientTxQuery, [toAccount, amount, fromAccount, description || 'Received Transfer', newRecipientBalance]);

        await client.query('COMMIT');
        
        res.json({
            message: 'Transfer successful',
            newBalance: newSenderBalance,
            transferAmount: amount,
            recipientAccount: toAccount
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Transfer error:', error);
        res.status(500).json({ message: 'Transfer failed' });
    } finally {
        client.release();
    }
});

app.get('/api/transactions/:accountNumber', authenticateToken, async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const { limit = 10, offset = 0, type } = req.query;

        if (req.user.accountNumber !== accountNumber) {
            return res.status(403).json({ message: 'Access denied' });
        }

        let query = `
            SELECT id, transaction_type as type, amount, recipient_account, description, 
                   balance_after, transaction_date as date
            FROM transactions 
            WHERE account_number = $1
        `;
        let params = [accountNumber];
        let paramIndex = 2;

        if (type && type !== 'all') {
            query += ` AND transaction_type = $${paramIndex++}`;
            params.push(type);
        }

        query += ` ORDER BY transaction_date DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
        params.push(parseInt(limit), parseInt(offset));

        const result = await pool.query(query, params);
        res.json(result.rows);

    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const query = `
            SELECT 
                first_name, 
                last_name, 
                account_number, 
                email, 
                phone, 
                address 
            FROM users 
            ORDER BY id ASC
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// User management routes
app.put('/api/users/:accountNumber', authenticateToken, async (req, res) => {
    try {
        const { accountNumber } = req.params;
        const { firstName, lastName, email, phone, address } = req.body;

        if (req.user.accountNumber !== accountNumber) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (!firstName || !lastName || !email || !phone || !address) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const existingUserResult = await pool.query(
            'SELECT id FROM users WHERE email = $1 AND account_number != $2', 
            [email, accountNumber]
        );

        if (existingUserResult.rows.length > 0) {
            return res.status(400).json({ message: 'Email is already taken' });
        }

        const updateQuery = `
            UPDATE users SET first_name = $1, last_name = $2, email = $3, phone = $4, address = $5
            WHERE account_number = $6
        `;
        await pool.query(updateQuery, [firstName, lastName, email, phone, address, accountNumber]);

        res.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({ message: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ message: 'Route not found' });
});

// Start server
async function startServer() {
    await initializeDatabase();
    
    app.listen(PORT, () => {
        console.log(`Bank Management System API server running on port ${PORT}`);
        console.log(`Health check available at: http://localhost:${PORT}/api/health`);
    });
}

// Handle graceful shutdown
const cleanup = async () => {
    console.log('Shutting down gracefully');
    await pool.end();
    process.exit(0);
};

process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);

startServer().catch(console.error);

module.exports = app;