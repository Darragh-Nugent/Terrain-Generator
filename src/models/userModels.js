const pool = require('../db');
const Person = require("../data/Person");
const bcrypt = require('bcrypt');


exports.getAll = async () => {
    try {
        const result = await pool.query('SELECT * FROM users');
        return result.rows;
    } catch (err) {
        console.log(err);
    }
}

exports.AddUser = async (uName, pass) => {
    try {
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [uName, pass]
        );
        return { id: result.rows[0].id, uName, pass };
    } catch (err) {
        console.log(err);
    }
}

exports.update = async (username, old_password, new_password) => {
    try {
        const valid_user = await this.verifyUser(username, old_password);
        if (valid_user.id && valid_user.username) {
            let salt_rounds = 10;
            const hash = await bcrypt.hash(new_password, salt_rounds);

            const result = await pool.query(
                'UPDATE users SET password = $1 WHERE username = $2',
                [hash, username]
            );
            return { updated: result.affectedRows > 0 };
        }
        else {
            throw new Error("Invalid username or password!");
        }
    } catch (err) {
        throw new Error("An error occured while updating: " + err.message);
    }
};

exports.remove = async (id) => {
    let conn;
    try {
        const result = await pool.query('DELETE FROM users WHERE id = $1', [id]);
        return { deleted: result.rowCount > 0 };
    } catch (err) {
        throw new Error("An error has occured while deleting a user: " + err.message);
    }
};

exports.findByUsername = async (uName) => {
    const conn = await pool.getConnection();
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [uName]);
        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        return new Person(user.id, user.username, user.password);
    } catch (err) {
        throw new Error("An error has occured while finding a user: " + err.message);
    }
}

exports.checkUserExists = async (username) => {
    let conn;
    try {
        const result = await pool.query('SELECT 1 FROM users WHERE username = $1', [username]);
        return { result: result.rows.length > 0 };
    } catch (err) {
        throw new Error("Error retreiving user: " + err.message)
    }
}

exports.verifyUser = async (username, password) => {
    let conn;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) throw new Error("Invalid username or password");
        if (result.rows.length <= 0) throw new Error("User does not exist!");
        
        const user = result.rows[0];

        const correct_password = await bcrypt.compare(password, user.password);
        if (!correct_password) throw new Error("Invalid username or password");

        return { id: user.id, username: user.username };
    } catch (err) {
        throw new Error("Error verifying user: " + err.message)
    }
};