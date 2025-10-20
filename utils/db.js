import knex from "knex";

const db = knex({
  client: "pg",
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    //ssl: { rejectUnauthorized: false }, // Sử dụng SSL nếu cần (khi deploy lên đám mây)
  },
  pool: { min: 0, max: 15 },
});

export default db;
