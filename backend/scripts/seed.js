// scripts/seed.js
// Creates an admin and a few demo trader accounts. Idempotent: skips existing emails.
//
// Run:  node scripts/seed.js

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const User      = require('../src/models/User');
const Portfolio = require('../src/models/Portfolio');
const { connectDB, disconnectDB } = require('../src/config/db');

const seedUsers = [
  { email: 'admin@papertrading.com',  username: 'admin',  password: 'admin123',  role: 'admin'  },
  { email: 'alice@example.com',       username: 'alice',  password: 'alice123',  role: 'trader' },
  { email: 'bob@example.com',         username: 'bob',    password: 'bob123',    role: 'trader' },
  { email: 'charlie@example.com',     username: 'charlie',password: 'charlie123',role: 'trader' }
];

(async () => {
  try {
    await connectDB();
    console.log('Connected to MongoDB');

    for (const data of seedUsers) {
      const exists = await User.findOne({ email: data.email });
      if (exists) {
        console.log(`Skip (exists): ${data.email}`);
        continue;
      }
      const user = await User.create(data);
      await Portfolio.create({ user: user._id, assets: [] });
      console.log(`Created: ${user.email}  /  password: ${data.password}`);
    }

    console.log('Seed complete.');
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
})();
