## Features

### Customer Features
- **Account Management**: Create accounts, view account details, check balance
- **Transaction Processing**: Deposit, withdraw, and transfer money
- **Transaction History**: View detailed transaction history with filters
- **Profile Management**: Update personal information and contact details
- **Secure Authentication**: JWT-based authentication with password hashing

### System Features
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Live balance and transaction updates
- **Security**: Rate limiting, input validation, SQL injection protection
- **Audit Logging**: Complete audit trail of all system activities
- **Session Management**: Secure session handling and token management

## Technology Stack

### Frontend
- **HTML5**: Modern semantic markup
- **CSS3**: Responsive design with Flexbox/Grid
- **JavaScript (ES6+)**: Modern vanilla JavaScript
- **Font Awesome**: Icons and UI elements

### Backend
- **Node.js**: JavaScript runtime environment
- **Express.js**: Web application framework
- **MySQL**: Relational database management
- **JWT**: JSON Web Tokens for authentication
- **bcrypt**: Password hashing and security

### Additional Libraries
- **cors**: Cross-origin resource sharing
- **express-rate-limit**: API rate limiting
- **mysql2**: MySQL database driver
- **dotenv**: Environment variable management

## Installation Instructions

### Prerequisites
- Node.js (v14.0.0 or higher)
- npm (v6.0.0 or higher)
- MySQL (v5.7 or higher)

### Step 1: Clone/Download the Project
```bash
# Download all the files to a project directory
mkdir bank-management-system
cd bank-management-system
```

### Step 2: Install Dependencies
```bash
# Install Node.js dependencies
npm install express mysql2 bcrypt jsonwebtoken cors express-rate-limit dotenv helmet express-validator

# For development (optional)
npm install --save-dev nodemon jest supertest
```

### Step 3: Database Setup
1. **Create MySQL Database**:
```sql
CREATE DATABASE bank_management;
```

2. **Run the database schema**:
```bash
# Import the database schema
mysql -u root -p bank_management < database_schema.sql
```

Or manually execute the SQL commands from `database_schema.sql` file.

### Step 4: Environment Configuration
Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=bank_management

# Security Configuration
JWT_SECRET=your_super_secret_jwt_key_here
BCRYPT_ROUNDS=12
```

**Important**: Change the `JWT_SECRET` to a strong, unique secret key for production.

### Step 5: Project Structure
Create the following directory structure:

```
bank-management-system/
├── server.js                 # Backend server
├── package.json             # Node.js dependencies
├── .env                     # Environment variables
├── database_schema.sql      # Database schema
├── public/                  # Frontend files
│   ├── index.html          # Main HTML file
│   ├── styles.css          # CSS styles
│   └── script.js           # JavaScript functionality
└── README.md               # This file
```

### Step 6: File Placement
1. Place `server.js` in the root directory
2. Create a `public` folder
3. Place `index.html`, `styles.css`, and `script.js` in the `public` folder

### Step 7: Start the Application
```bash
# Start the server
npm start

# For development with auto-restart
npm run dev
```

### Step 8: Access the Application
- Open your web browser
- Navigate to: `http://localhost:3000`
- The banking system should be running!

## Usage Instructions

### For Customers

#### Registration
1. Click "Register here" on the login page
2. Fill in all required information:
   - Personal details (name, email, phone, address)
   - Account type (savings, current, fixed)
   - Initial deposit amount (minimum $100)
   - Password (secure password required)
3. Submit the form
4. Note down your account number for future logins

#### Login
1. Enter your account number and password
2. Click "Login"
3. You'll be redirected to the dashboard

#### Dashboard Features
- **Overview**: View current balance and recent transactions
- **Accounts**: Detailed account information
- **Transfer Money**: Send money to other accounts
- **Transaction History**: View all past transactions
- **Profile**: Update personal information

#### Making Transactions
1. **Deposit**: Use the "Deposit" button on the dashboard
2. **Withdraw**: Use the "Withdraw" button on the dashboard
3. **Transfer**: Go to "Transfer Money" section, enter recipient account and amount

### Sample Test Accounts
The system includes sample accounts for testing:

**Account 1**:
- Account Number: `1000000001`
- Password: `password123`
- Balance: $5,000.00

**Account 2**:
- Account Number: `1000000002`
- Password: `password123`
- Balance: $10,000.00

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new account
- `POST /api/auth/login` - User login

### Account Management
- `GET /api/accounts/:accountNumber` - Get account details
- `GET /api/accounts/:accountNumber/balance` - Get account balance

### Transactions
- `POST /api/transactions/deposit` - Make deposit
- `POST /api/transactions/withdraw` - Make withdrawal
- `POST /api/transactions/transfer` - Transfer money
- `GET /api/transactions/:accountNumber` - Get transaction history

### User Management
- `PUT /api/users/:accountNumber` - Update user profile

## Security Features

1. **Password Security**: Passwords are hashed using bcrypt with 12 rounds
2. **JWT Authentication**: Secure token-based authentication
3. **Rate Limiting**: API endpoints are rate-limited to prevent abuse
4. **Input Validation**: All inputs are validated on both client and server
5. **SQL Injection Protection**: Parameterized queries prevent SQL injection
6. **CORS Protection**: Cross-origin requests are properly configured
7. **Session Management**: Secure session handling with token expiration

## Database Schema

The system uses the following main tables:
- `users`: Customer information and credentials
- `accounts`: Account details and balances
- `transactions`: All transaction records
- `admin_users`: Bank staff access
- `audit_logs`: System activity logging

## Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check MySQL server is running
   - Verify database credentials in `.env` file
   - Ensure database `bank_management` exists

2. **Port Already in Use**:
   - Change the PORT in `.env` file
   - Kill any process using port 3000: `lsof -ti:3000 | xargs kill -9`

3. **Module Not Found**:
   - Run `npm install` to install all dependencies
   - Check `package.json` for required modules

4. **Login Issues**:
   - Use sample accounts for testing
   - Check browser console for error messages
   - Verify server is running on correct port

5. **Frontend Not Loading**:
   - Ensure files are in the `public` folder
   - Check browser console for JavaScript errors
   - Verify server is serving static files correctly

### Development Tips

1. **Enable Development Mode**:
```bash
npm install -g nodemon
npm run dev
```

2. **Database Debugging**:
- Use MySQL Workbench or phpMyAdmin
- Check server logs for SQL errors
- Verify table structure matches schema

3. **API Testing**:
- Use Postman or similar tools
- Check `/api/health` endpoint first
- Verify JWT tokens are included in requests

## Production Deployment

### Security Checklist
- [ ] Change default JWT_SECRET
- [ ] Use strong database passwords
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable audit logging
- [ ] Configure rate limiting
- [ ] Remove test accounts

### Environment Setup
1. Set `NODE_ENV=production`
2. Use production database
3. Configure reverse proxy (nginx)
4. Set up SSL certificates
5. Configure monitoring and logging

## Support and Documentation

### Getting Help
- Check the troubleshooting section
- Review server logs for errors
- Verify database connections
- Test API endpoints individually

### Contributing
1. Fork the repository
2. Create feature branches
3. Add comprehensive tests
4. Submit pull requests

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Version History

- **v1.0.0**: Initial release with core banking features
- Full transaction management
- Account creation and management
- Secure authentication system
- Responsive web interface
- Complete API documentation

---

**Note**: This is a educational/demonstration project. For production use, additional security measures, compliance requirements, and banking regulations should be implemented.

print("README documentation created successfully!")