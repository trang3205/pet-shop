import pkg from "pg";
const { Client } = pkg;
import "dotenv/config";

async function testConnection() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }, // Required for Supabase
  });

  try {
    await client.connect();
    console.log("✅ Kết nối database THÀNH CÔNG!");

    // Test query đơn giản
    const result = await client.query("SELECT version()");
    console.log("📊 PostgreSQL Version:", result.rows[0].version);

    // Test current time
    const timeResult = await client.query("SELECT NOW()");
    console.log("⏰ Current time:", timeResult.rows[0].now);
  } catch (error) {
    console.log("❌ Kết nối database THẤT BẠI:");
    console.log("Error:", error.message);
  } finally {
    await client.end();
  }
}

testConnection();
