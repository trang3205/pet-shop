// utils/db.js
import knex from "knex";

console.log('🔧 Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing');

const db = knex({
  client: "pg",
<<<<<<< HEAD
  connection: process.env.DATABASE_URL + "?sslmode=no-verify",
=======
  connection: process.env.DATABASE_URL + '?sslmode=no-verify',
>>>>>>> feature/customer
  pool: { min: 0, max: 15 },
});

// Test connection
db.raw('SELECT 1')
  .then(() => console.log('✅ Database connected successfully!'))
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    console.log('Connection string used:', process.env.DATABASE_URL);
  });

export default db;