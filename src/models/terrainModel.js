const pool = require('../db');
const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");
const Terrain = require("../data/Terrain");

const bucketName = 'n11547227-a2-terrains';
const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

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

exports.editTerrain = async (newTerrain, userId) => {
    const conn = await pool.getConnection();
    try { 
        const result = await conn.query('UPDATE terrains SET seed=?, size=?, heightScale=?, octaves=?, iterations=?, user_id=? WHERE id=?', 
        [newTerrain.seed, newTerrain.size, newTerrain.heightScale, newTerrain.octaves, newTerrain.iterations, userId, newTerrain.id]);
        return new Terrain(Number(newTerrain.seed), newTerrain.size, newTerrain.heightScale, newTerrain.octaves, newTerrain.iterations, 
            Number(newTerrain.id), userId)
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

exports.hasTerrain = async (id, userId) => {
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query(
            'SELECT * FROM terrains WHERE id = ? AND user_id = ?', [id, userId]
        );               
        return rows.length > 0;  
    }
    finally {
        conn.release();
    }   
}


exports.getAllFromUser = async (userId) => {
    const conn = await pool.getConnection();
    try { 
        const rows = await conn.query('SELECT * FROM terrains WHERE user_id = ?', [userId]);
        const terrains = rows.map(row => new Terrain(
            Number(row.seed), row.size, row.heightScale, row.octaves, row.iterations, Number(row.id), Number(row.user_id)
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
}

exports.hasHeightMapBucket = async (id) => {
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query(
            'SELECT s3_2d_key FROM terrains WHERE id = ?', [id]
        );               
        if (rows.length === 0) return false;
        const row = rows[0];
        return row['s3_2d_key'] != null;    
    }
    finally {
        conn.release();
    }   
}

exports.has3DMapBucket = async (id) => {
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query(
            'SELECT 3d_s3_key FROM terrains WHERE id = ?', [id]
        );               
        if (rows.length === 0) return false;
        const row = rows[0];
        return row['3d_s3_key'] != null;    
    }
    finally {
        conn.release();
    }   
}

exports.createHeightMapBucket = async (id, imageStream) => {
    const conn = await pool.getConnection();
    try {
        const objectKey = "terrains/heightmaps/terrain-" + id + ".png";
        const result = await conn.query('UPDATE terrains SET s3_2d_key=? WHERE id=?',  [objectKey, id]);

        const response = await s3Client.send(
            new S3.PutObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
                Body: imageStream
            })
        );
        return objectKey;
    } finally {
        conn.release();
    }
}

exports.getPresignedHeightMapUrl = async (id) => {
    const conn = await pool.getConnection();
    try {
        const rows = await conn.query(
            'SELECT s3_2d_key FROM terrains WHERE id = ?', [id]
        );
        const objectKey = rows[0]['s3_2d_key'];

        const command = new S3.GetObjectCommand({
                Bucket: bucketName,
                Key: objectKey,
            });
        const presignedURL = await S3Presigner.getSignedUrl(s3Client, command, {expiresIn: 3600} );
        
        console.log('Pre-signed URL to get the object:')
        console.log(presignedURL);

        return presignedURL;

    } catch (err) {
        console.log(err);
    } finally {
    conn.release();
    }
}