const { Pool } = require('pg');
require('dotenv').config();


const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'pass',
  database: process.env.DB_NAME || 'mydb',
  port: 5432,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

(async () => {
  const client = await pool.connect();
  try {
    console.log('PostgreSQL connection successful.');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      )
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS terrains (
        id SERIAL PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        seed INT NOT NULL,
        size INT NOT NULL,
        heightScale INT NOT NULL,
        octaves INT NOT NULL,
        iterations INT NOT NULL,
        style VARCHAR(50) NOT NULL,
        s3_2d_key VARCHAR(255),
        s3_3d_key VARCHAR(255)
      )
    `);
  } catch (err) {
    console.error('DB init failed:', err.message);
  } finally {
    client.release();
  }
})();

module.exports = pool;
