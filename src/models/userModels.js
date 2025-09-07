const pool = require('../db');
const Person = require("../data/Person");
const bcrypt = require('bcrypt');


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

exports.update = async (username, old_password, new_password) => {
    let conn;
    try {
        const valid_user = await this.verifyUser(username, old_password);
        if (valid_user.id && valid_user.username) {
            let salt_rounds = 10;
            const hash = await bcrypt.hash(new_password, salt_rounds);

            conn = await pool.getConnection();
            const result = await conn.query(
                'UPDATE users SET password = ? WHERE username = ?',
                [hash, username]
            );
            return { updated: result.affectedRows > 0 };
        }
        else {
            throw new Error("Invalid username or password!");
        }
    } catch (err) {
        throw new Error("An error occured while updating: " + err.message);
    } finally {
        if (conn) { conn.release(); }
    }
};

exports.remove = async (id) => {
    let conn;
    try {
        const conn = await pool.getConnection();
        const result = await conn.query('DELETE FROM users WHERE id = ?', [id]);
        return { deleted: result.affectedRows > 0 };
    } catch (err) {
        throw new Error("An error has occured while deleting a user: " + err.message);
    }
    finally {
        if (conn) {
            conn.release();
        }
    }
};

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

exports.checkUserExists = async (username) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT username FROM users WHERE username = ?', [username])
        if (rows.length <= 0) {
            return { result: false }
        }
        return { result: true };
    } catch (err) {
        throw new Error("Error retreiving user: " + err.message)
    } finally {
        if (conn) conn.release();
    }
}

exports.verifyUser = async (username, password) => {
    let conn;
    try {
        conn = await pool.getConnection();
        const rows = await conn.query('SELECT * FROM users WHERE username = ?', [username]);
        if (rows.length === 0) {
            throw new Error("Invalid username or password!");
        }
        const user = rows[0];
        if (rows.length <= 0) throw new Error("User does not exist!");
        const correct_password = await bcrypt.compare(password, user.password);
        if (!correct_password) {
            throw new Error("Invalid username or password!")
        }
        // const token = generateAccessToken({ username });
        return { id: user.id, username: user.username };
    } catch (err) {
        throw new Error("Error verifying user: " + err.message)
    } finally {
        if (conn) conn.release();
    }
};