const express = require('express');
const app = express();

// Middleware to parse JSON (useful for POST requests)
app.use(express.json());

// A sample GET route
app.get('/', (req, res) => {
  res.status(200).send('Welcome to your Node.js API on Vercel!');
});

// A sample API route with data
app.get('/api/user', (req, res) => {
  res.json({
    id: 1,
    name: 'Gemini User',
    status: 'Active',
    timestamp: new Date().toISOString()
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

// For local development
if (process.env.NODE_ENV !== 'production') {
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

// Export for Vercel's serverless handler
module.exports = app;