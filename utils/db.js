import knex from "knex";

const db = knex({
  client: "pg",
  connection: process.env.DATABASE_URL + "?sslmode=no-verify",
  pool: { min: 0, max: 15 },
});

export default db;
