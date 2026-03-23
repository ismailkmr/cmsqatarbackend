import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Serve static files from the uploads directory
app.use('/uploads', express.static(uploadDir));

// Configure Multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send('Hello World from Express!');
});

app.post('/api/upload', upload.single('bill'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  // Generate the URL to access the file
  const fileUrl = `http://localhost:${PORT}/uploads/${req.file.filename}`;

  res.json({
    success: true,
    message: 'File uploaded successfully',
    url: fileUrl,
    filename: req.file.filename
  });
});

// Mock balance sheet data
const balanceSheetData = {
  totalAssets: 15450,
  totalLiabilities: 3200,
  netValue: 12250,
  breakdown: [
    { category: 'Cash in Hand', amount: 4500, type: 'Asset' },
    { category: 'Bank Balance', amount: 10000, type: 'Asset' },
    { category: 'Inventory', amount: 950, type: 'Asset' },
    { category: 'Accounts Payable', amount: 2200, type: 'Liability' },
    { category: 'Short-term Loan', amount: 1000, type: 'Liability' }
  ],
  ledgerSummary: [
    { category: 'Sales', income: 9700, expense: 0, net: 9700 },
    { category: 'Utilities', income: 0, expense: 200, net: -200 },
    { category: 'Staff Salaries', income: 0, expense: 2500, net: -2500 },
    { category: 'Rent', income: 0, expense: 500, net: -500 }
  ]
};

// Mock employee data
let employees = [
  { 
    id: 1, 
    name: 'Alice Smith', 
    position: 'Cashier', 
    status: 'Active', 
    idExpiry: '2027-05-10', 
    joinDate: '2023-01-15',
    qatarId: '29012345678',
    visaExpiry: '2026-10-20',
    nationality: 'Indian',
    passportNumber: 'L1234567'
  },
  { 
    id: 2, 
    name: 'Bob Johnson', 
    position: 'Stock Clerk', 
    status: 'Active', 
    idExpiry: '2024-02-15', 
    joinDate: '2022-11-01',
    qatarId: '28012345679',
    visaExpiry: '2024-03-15',
    nationality: 'Nepalese',
    passportNumber: 'M7654321'
  },
  { 
    id: 3, 
    name: 'Charlie Davis', 
    position: 'Manager', 
    status: 'Inactive', 
    idExpiry: '2026-08-20', 
    joinDate: '2021-06-20',
    qatarId: '27012345680',
    visaExpiry: '2026-12-20',
    nationality: 'Bengali',
    passportNumber: 'N9876543'
  },
];

app.get('/api/balance-sheet', (req, res) => {
  res.json({
    success: true,
    data: balanceSheetData,
    timestamp: new Date().toISOString()
  });
});

// GET all employees
app.get('/api/employees', (req, res) => {
  res.json({
    success: true,
    data: employees,
    count: employees.length
  });
});

// POST new employee
app.post('/api/employees', (req, res) => {
  const { name, position, status, joinDate, idExpiry, password, qatarId, visaExpiry, nationality, passportNumber } = req.body;
  
  if (!name || !position) {
    return res.status(400).json({ success: false, message: 'Name and Position are required' });
  }

  const newEmployee = {
    id: Date.now(), // Simplified ID generation
    name,
    position,
    status: status || 'Active',
    joinDate: joinDate || new Date().toISOString().split('T')[0],
    idExpiry,
    password, // Store password (prototype only)
    qatarId: qatarId || 'N/A',
    visaExpiry: visaExpiry || idExpiry, // Default to ID expiry if not provided
    nationality: nationality || 'N/A',
    passportNumber: passportNumber || 'N/A',
    createdAt: new Date().toISOString()
  };

  employees.push(newEmployee);
  
  res.status(201).json({
    success: true,
    message: 'Employee created successfully',
    data: newEmployee
  });
});

app.listen(PORT, () => {
  console.log(`Upload API running at http://localhost:${PORT}`);
});
