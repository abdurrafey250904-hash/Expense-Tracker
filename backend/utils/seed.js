/**
 * Seeds a demo user with ~2 months of sample expenses.
 * Run with: npm run seed
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Expense = require('../models/Expense');

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = 'demo1234';

const sampleTitles = {
  Food: ['Lunch at cafe', 'Dinner out', 'Coffee run', 'Fast food'],
  Groceries: ['Weekly groceries', 'Supermarket run', 'Fruits & veggies'],
  Transportation: ['Uber ride', 'Fuel', 'Bus pass'],
  Entertainment: ['Movie night', 'Streaming subscription', 'Concert ticket'],
  Utilities: ['Electricity bill', 'Internet bill', 'Water bill'],
  Shopping: ['New shoes', 'Clothing', 'Electronics accessory'],
  Healthcare: ['Pharmacy', 'Doctor visit'],
  Bills: ['Phone bill', 'Insurance premium'],
};

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seed() {
  await connectDB();

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({
      name: 'Demo User',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      monthlyBudget: 1500,
    });
    console.log(`Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log('Demo user already exists, adding more expenses...');
  }

  await Expense.deleteMany({ user: user._id });

  const categories = Object.keys(sampleTitles);
  const now = new Date();
  const expensesToCreate = [];

  for (let monthOffset = 1; monthOffset >= 0; monthOffset--) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);
    const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();

    for (let i = 0; i < 25; i++) {
      const category = randomFrom(categories);
      const day = Math.floor(Math.random() * daysInMonth) + 1;
      const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), day);
      if (date > now) continue;

      expensesToCreate.push({
        user: user._id,
        title: randomFrom(sampleTitles[category]),
        amount: parseFloat((Math.random() * 90 + 5).toFixed(2)),
        category,
        date,
        paymentMethod: randomFrom(['Cash', 'Card', 'Mobile Wallet']),
      });
    }
  }

  await Expense.insertMany(expensesToCreate);
  console.log(`Inserted ${expensesToCreate.length} sample expenses.`);

  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
