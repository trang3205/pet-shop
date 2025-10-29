import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

console.log("🔗 Testing with EXACT Session Pooler connection...");

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function testConnection() {
  try {
    await client.connect();
    console.log("✅ Kết nối database thành công!");
    console.log("📍 Session Pooler - IPv4 Compatible");

    const res = await client.query("SELECT version()");
    console.log("PostgreSQL Version:", res.rows[0].version);

    await client.end();
    console.log("✅ Connection closed!");
  } catch (err) {
    console.error("❌ Lỗi kết nối:", err.message);
  }
}

testConnection();
