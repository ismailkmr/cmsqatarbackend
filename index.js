const express = require('express');
const app = express();
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const JWT_SECRET = 'your-very-secret-key-123'; // In production, use environment variables
const connection = mysql.createConnection({
  host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
  user: 'gVGNtoZeCxHwRYy.root',
  password: 'LjMczNp7z3MlDFRo', // or your password
  database: 'test',
  ssl: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true
  }
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting to TiDB Cloud:', err);
    return;
  }
  console.log('Connected to TiDB Cloud ✅');
  initializeDatabase();
});

// Initialize database tables
function initializeDatabase() {
  const createUserTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(50) DEFAULT 'Staff',
      name VARCHAR(255)
    )
  `;

  connection.query(createUserTable, (err) => {
    if (err) {
      console.error('Error creating users table:', err);
    } else {
      console.log('Users table ready ✅');
      // Seed an admin user if none exists
      seedAdminUser();
    }
  });

  const createEmployeesTable = `
    CREATE TABLE IF NOT EXISTS employees (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      position VARCHAR(255) NOT NULL,
      status VARCHAR(50) DEFAULT 'Active',
      join_date DATE,
      id_expiry DATE,
      visa_expiry DATE,
      nationality VARCHAR(100),
      passport_number VARCHAR(100),
      qatar_id VARCHAR(100),
      password VARCHAR(255)
    )
  `;

  connection.query(createEmployeesTable, (err) => {
    if (err) {
      console.error('Error creating employees table:', err);
    } else {
      console.log('Employees table ready ✅');
    }
  });

  const createDaybookTable = `
    CREATE TABLE IF NOT EXISTS daybook (
      id INT AUTO_INCREMENT PRIMARY KEY,
      txn_date DATE NOT NULL,
      description VARCHAR(255),
      category VARCHAR(100),
      income DECIMAL(15, 2) DEFAULT 0.00,
      expense DECIMAL(15, 2) DEFAULT 0.00,
      shop_id INT DEFAULT 1,
      status VARCHAR(50) DEFAULT 'Active',
      image VARCHAR(255)
    )
  `;

    connection.query(createDaybookTable, (err) => {
    if (err) {
      console.error('Error creating daybook table:', err);
    } else {
      console.log('Daybook table ready ✅');
      // Ensure missing columns exist in case the table was created with a different schema
      connection.query('ALTER TABLE daybook ADD COLUMN IF NOT EXISTS category VARCHAR(100), ADD COLUMN IF NOT EXISTS income DECIMAL(15, 2) DEFAULT 0.00, ADD COLUMN IF NOT EXISTS expense DECIMAL(15, 2) DEFAULT 0.00, ADD COLUMN IF NOT EXISTS image VARCHAR(255)', (alterErr) => {
        if (alterErr) {
          if (alterErr.code !== 'ER_DUP_FIELDNAME') {
            console.error('Error ensuring daybook columns:', alterErr.message);
          }
        }
        // Force status to be VARCHAR instead of ENUM to avoid truncation errors with 'Active' vs 'ACTIVE'
        connection.query('ALTER TABLE daybook MODIFY COLUMN status VARCHAR(50) DEFAULT "Active"', (modifyErr) => {
          if (modifyErr) console.error('Error modifying status column:', modifyErr.message);
        });
      });
    }
  });
}

function seedAdminUser() {
  const checkAdmin = 'SELECT * FROM users WHERE email = ?';
  connection.query(checkAdmin, ['admin@csms.com'], async (err, results) => {
    if (results && results.length === 0) {
      const hashedPassword = await bcrypt.hash('admin@123', 10);
      const insertAdmin = 'INSERT INTO users (email, password, role, name) VALUES (?, ?, ?, ?)';
      connection.query(insertAdmin, ['admin@csms.com', hashedPassword, 'Admin', 'Default Admin'], (err) => {
        if (err) console.error('Error seeding admin user:', err);
        else console.log('Default admin user seeded: admin@csms.com / admin@123 ✅');
      });
    }
  });
}



// Middleware to parse JSON (useful for POST requests)
app.use(express.json());
app.use(cors());

// Configure Multer and static serving for uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Upload endpoint
app.post('/api/upload', upload.single('bill'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const PORT = process.env.PORT || 3000;
  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;
  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    filename: req.file.filename
  });
});

// A sample GET route
app.get('/', (req, res) => {
  res.status(200).send('Welcome to your Node.js API on Vercel!');
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  const query = 'SELECT * FROM users WHERE email = ?';
  connection.query(query, [email], async (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const user = results[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  });
});

// Register endpoint (utility)
app.post('/api/register', async (req, res) => {
  const { email, password, name, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = 'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)';
    connection.query(query, [email, hashedPassword, name || '', role || 'Staff'], (err, results) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ success: false, message: 'Email already exists' });
        }
        console.error('Registration error:', err);
        return res.status(500).json({ success: false, message: 'Internal server error' });
      }
      res.status(201).json({ success: true, message: 'User registered successfully' });
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// A sample API route with data
app.get('/api/user', (req, res) => {
  res.send({
    id: 1,
    name: 'Gemini User',
    status: 'Active',
    timestamp: new Date().toISOString()
  });
});

// Production-ready Dynamic Balance Sheet API with filtering
app.get('/api/balance-sheet', (req, res) => {
  const { month, year } = req.query;
  let query = 'SELECT category, SUM(income) as total_income, SUM(expense) as total_expense FROM daybook';
  let params = [];

  if (month && year) {
    query += ' WHERE MONTH(txn_date) = ? AND YEAR(txn_date) = ?';
    params.push(month, year);
  }

  query += ' GROUP BY category';
  
  connection.query(query, params, (err, results) => {
    if (err) {
      console.error('Error calculating balance sheet:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    let totalIncome = 0;
    let totalExpense = 0;
    
    const ledgerSummary = results.map(row => {
      const income = parseFloat(row.total_income) || 0;
      const expense = parseFloat(row.total_expense) || 0;
      totalIncome += income;
      totalExpense += expense;
      return {
        category: row.category || 'Uncategorized',
        income: income,
        expense: expense,
        net: income - expense
      };
    });

    res.json({
      success: true,
      data: {
        totalAssets: totalIncome,
        totalLiabilities: totalExpense,
        netValue: totalIncome - totalExpense,
        ledgerSummary: ledgerSummary,
        period: month && year ? `${month}/${year}` : 'All Time'
      },
      timestamp: new Date().toISOString()
    });
  });
});

// GET all employees from TiDB
app.get('/api/employees', (req, res) => {
  const query = 'SELECT * FROM employees ORDER BY id DESC';

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error fetching employees:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.json({
      success: true,
      data: results,
      count: results.length
    });
  });
});

// POST new employee to TiDB
app.post('/api/employees', (req, res) => {
  const { name, position, status, joinDate, idExpiry, password, qatarId, visaExpiry, nationality, passportNumber } = req.body;

  if (!name || !position) {
    return res.status(400).json({ success: false, message: 'Name and Position are required' });
  }

  const query = `
    INSERT INTO employees (
      name, position, status, join_date, id_expiry, 
      password, qatar_id, visa_expiry, nationality, passport_number
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    name,
    position,
    status || 'Active',
    joinDate || null,
    idExpiry || null,
    password || null,
    qatarId || 'N/A',
    visaExpiry || idExpiry || null,
    nationality || 'N/A',
    passportNumber || 'N/A'
  ].map(v => v === '' ? null : v);

  connection.query(query, values, (err, results) => {
    if (err) {
      console.error('Error inserting employee:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        id: results.insertId,
        ...req.body,
        status: status || 'Active',
        qatarId: qatarId || 'N/A',
        nationality: nationality || 'N/A',
        passportNumber: passportNumber || 'N/A'
      }
    });
  });
});


// DELETE an employee from TiDB
app.delete('/api/employees/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM employees WHERE id = ?';

  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting employee:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  });
});


// GET all daybook entries from TiDB (with optional month/year filtering)
app.get('/api/daybook', (req, res) => {
  const { month, year } = req.query;
  let query = 'SELECT * FROM daybook';
  let params = [];

  if (month && year) {
    query += ' WHERE MONTH(txn_date) = ? AND YEAR(txn_date) = ?';
    params.push(month, year);
  }

  query += ' ORDER BY txn_date DESC';

  connection.query(query, params, (err, results) => {
    if (err) {
      console.error('Error fetching daybook data:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.json({
      success: true,
      count: results.length,
      data: results
    });
  });
});


// POST a new daybook entry to TiDB
app.post('/api/daybook', (req, res) => {
  const { txn_date, description, category, income, expense, type, image } = req.body;

  // Basic validation/transformation if needed
  const finalIncome = type === 'Income' ? (req.body.amount || income || 0) : 0;
  const finalExpense = type === 'Expense' ? (req.body.amount || expense || 0) : 0;

  const query = 'INSERT INTO daybook (txn_date, description, category, income, expense, shop_id, status, image) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  const values = [
    txn_date || new Date().toISOString().split('T')[0],
    description || '',
    category || '',
    finalIncome,
    finalExpense,
    1, // Default shop_id
    'Active',
    image || null
  ];

  connection.query(query, values, (err, results) => {
    if (err) {
      console.error('Error inserting daybook data:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.status(201).json({
      success: true,
      message: 'Entry added successfully',
      id: results.insertId
    });
  });
});


// DELETE a daybook entry from TiDB
app.delete('/api/daybook/:id', (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM daybook WHERE id = ?';

  connection.query(query, [id], (err, results) => {
    if (err) {
      console.error('Error deleting daybook data:', err);
      return res.status(500).json({ success: false, message: 'Internal server error' });
    }
    res.json({
      success: true,
      message: 'Entry deleted successfully'
    });
  });
});


// For local development and Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Export for Vercel's serverless handler
module.exports = app;