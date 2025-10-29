// test-db.js
import pg from "pg";
import dotenv from "dotenv";
const { Client } = pg;

dotenv.config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Kết nối database thành công!");
    const res = await client.query("SELECT version()");
    console.log("PostgreSQL Version:", res.rows[0].version);
    await client.end();
  } catch (err) {
    console.error("❌ Lỗi kết nối:", err.message);
  }
}

testConnection();
