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

app.get('/api/balance-sheet', (req, res) => {
  res.json({
    success: true,
    data: balanceSheetData,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Upload API running at http://localhost:${PORT}`);
});
