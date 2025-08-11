const pool = require('../db');
const Terrain = require("../data/Terrain");

exports.addTerrain = async (seed, size, heightScale, octaves, userId) => {
    const conn = await pool.getConnection();
    try { 
        const result = await conn.query('INSERT INTO terrains (seed, size, heightScale, octaves, user_id) VALUES (?, ?, ?, ?, ?)', 
        [seed, size, heightScale, octaves, userId]);

        return new Terrain(Number(result).insertId, Number(seed), size, heightScale, octaves, userId)
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
        row.id, row.seed, row.size, row.heightScale, row.octaves, row.user_id
        ));

        return terrains;  // return array of Terrain objects
    } finally {
        conn.release();
    }
}

exports.getFromUser = async (id, userId) => {
    const conn = await pool.getConnection();
    try { 
        const result = await conn.query('SELECT * FROM terrains WHERE user_id = ? AND id = ?', [userId, id]);
        return new Terrain(id, result.seed, result.size, result.heightScale, result.octaves, userId)
    } finally {
        conn.release();
    }
}