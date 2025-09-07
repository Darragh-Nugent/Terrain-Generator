const pool = require('../db');
const bcrypt = require('bcrypt')
// const { generateAccessToken } = require('../middleware/jwt')

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

exports.create = async (username, password) => {
    let conn;
    try {
        conn = await pool.getConnection();
        let salt_rounds = 10;
        const hash = await bcrypt.hash(password, salt_rounds);

        const result = await conn.query('INSERT INTO users (username, password) VALUES (?, ?)', [username, hash]);
        return { id: Number(result.insertId), username };
    }
    catch (err) {
        throw new Error('Failed to create user: ' + err.message);
    }
    finally {
        if (conn) conn.release();
    }
};

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