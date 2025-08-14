const pool = require('../db');
const Rule = require("../data/Rule");

exports.addRule = async (terrainId, condition, value) => {
    const conn = await pool.getConnection();
    try { 
        const result = await conn.query('INSERT INTO rules (terrain_id, rule_condition, value) VALUES (?, ?, ?)', 
        [terrainId, condition, value]);

        return new Rule(Number(result).insertId, condition, value)
    } finally {
        conn.release();
    }
}

exports.getTerrainRules = async (terrainId) => {
    const conn = await pool.getConnection();
    try { 
        const rows = await conn.query('SELECT * FROM rules WHERE terrain_id = ?', [terrainId]);
        const rules = rows.map(row => new Rule(
        row.id, row.rule_condition, row.value, row.terrainId
        ));

        return rules;  // return array of Terrain objects
    } finally {
        conn.release();
    }
}
