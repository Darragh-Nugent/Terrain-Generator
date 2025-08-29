const mariadb = require('mariadb');

const pool = mariadb.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'user',
  password: process.env.DB_PASSWORD || 'pass',
  database: process.env.DB_NAME || 'terrainsdb',
  connectionLimit: 5,
  acquireTimeout: 20000
});

// Init logic without messing with exports
(async () => {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('Connection successful.');

    // Create User table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL
      )
    `);

    // Create Terrain table
    await conn.query(`
        CREATE TABLE IF NOT EXISTS terrains (        
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id INT NOT NULL,
            seed INT NOT NULL,
            size INT UNSIGNED NOT NULL,
            heightScale INT NOT NULL,
            octaves INT NOT NULL,
            iterations INT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);
  } catch (err) {
    console.error('DB init failed:', err.message);
  } finally {
    if (conn) {
      conn.release();
      console.log('Releasing connection...');
    }
  }
})();

module.exports = pool;