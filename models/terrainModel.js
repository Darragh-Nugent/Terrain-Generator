const pool = require('../db');
const Terrain = require("../data/Terrain");

exports.addTerrain = async (seed, size, heightScale, octaves, iterations, userId) => {
    const conn = await pool.getConnection();
    try { 
        const result = await conn.query('INSERT INTO terrains (seed, size, heightScale, octaves, iterations, user_id) VALUES (?, ?, ?, ?, ?, ?)', 
        [seed, size, heightScale, octaves, iterations, userId]);
        return new Terrain(Number(seed), size, heightScale, octaves, iterations, Number(result.insertId), userId)
    } finally {
        conn.release();
    }
}

exports.deleteTerrain = async (id) => {
    const conn = await pool.getConnection();
    try { 
        const result = await conn.query('DELETE FROM terrains WHERE id = ?', [id]); 
    } finally {
        conn.release();
    }
}


exports.getAllFromUser = async (userId) => {
    const conn = await pool.getConnection();
    try { 
        const rows = await conn.query('SELECT * FROM terrains WHERE user_id = ?', [userId]);
        const terrains = rows.map(row => new Terrain(
            row.seed, row.size, row.heightScale, row.octaves, row.iterations, row.id, row.user_id
        ));

        return terrains;
    } finally {
        conn.release();
    }
}

exports.getFromUser = async (id, userId) => {
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query(
            'SELECT * FROM terrains WHERE id = ? AND user_id = ?', [id, userId]
        );


        if (rows.length === 0) return null;

        const row = rows[0];

        return new Terrain(
          row.seed,
          row.size,
          row.heightScale,
          row.octaves,
          row.iterations,
          row.id,
          row.user_id
        );
    } finally {
        conn.release();
    }
};