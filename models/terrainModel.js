const pool = require('../db');
const Terrain = require("../data/Terrain");
const { use } = require('bcrypt/promises');

exports.addTerrain = async (seed, size, heightScale, octaves, userId) => {
    const conn = await pool.getConnection();
    try { 
        const result = await conn.query('INSERT INTO terrains (seed, size, heightScale, octaves, user_id) VALUES (?, ?, ?, ?, ?)', 
        [seed, size, heightScale, octaves, userId]);

        return new Terrain(Number(seed), size, heightScale, octaves, Number(result.insertId), userId)
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
          Number(row.seed), row.size, row.heightScale, row.octaves, Number(row.id), Number(row.user_id)
        ));

        return terrains;  // return array of Terrain objects
    } finally {
        conn.release();
    }
}

exports.getFromUser = async (id, userId) => {
    console.log(`id=${id},userid=${userId}`);
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query(
            'SELECT * FROM terrains WHERE id = ? AND user_id = ?', [id, userId]
        );

        console.log("Fetching terrain with id:", id, "and userId:", userId);
        console.log("Query result:", rows);


        if (rows.length === 0) return null; // or throw an error

        const row = rows[0];

        return new Terrain(
          row.seed,
          row.size,
          row.heightScale,
          row.octaves,
          row.id,
          row.user_id
        );
    } finally {
        conn.release();
    }
};