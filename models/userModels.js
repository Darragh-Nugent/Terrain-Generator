const pool = require('../db');
const Person = require("../data/Person");

exports.getAll = async () => {
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query('SELECT * FROM users');
        return rows;
    } finally {
        conn.release();
    }
}

exports.AddUser = async (uName, pass) => {
    const conn = await pool.getConnection();
    try {
        const result = await conn.query('INSERT INTO users (username, password) VALUES (?, ?)', [uName, pass]);
        conn.release();
        return {id: Number(result.insertId), uName, pass};
    } finally {
        conn.release();
    }
}

exports.findByUsername = async (uName) => {
    const conn = await pool.getConnection();
    try {
        const result = await conn.query('SELECT * FROM users WHERE username = ?', [uName]);
        if (!result) return null;
        const user = result[0];
        const person = new Person(user.id, user.username, user.password);
        conn.release();
        return person;
    } finally {
        conn.release();
    }
}