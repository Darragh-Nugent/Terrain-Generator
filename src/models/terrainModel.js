const pool = require('../db');
const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");
const Terrain = require("../data/Terrain");

const bucketName = 'n11547227-a2-terrains';
const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

exports.addTerrain = async (seed, size, heightScale, octaves, iterations, userId) => {
    try {
        const result = await pool.query(`
            INSERT INTO terrains (seed, size, heightScale, octaves, iterations, user_id)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING id
        `, [seed, size, heightScale, octaves, iterations, userId]);

        return new Terrain(Number(seed), size, heightScale, octaves, iterations, result.rows[0].id, userId);
    } catch (err) {
        console.error('Error in addTerrain:', err.message);
    }
}

async function deleteBucketObjects(id) {
    const result = await pool.query(
        'SELECT s3_2d_key, s3_3d_key FROM terrains WHERE id = $1', [id]
    );
    const row = result.rows[0];

    if (row?.s3_2d_key) {
        await s3Client.send(new S3.DeleteObjectCommand({ Bucket: bucketName, Key: row.s3_2d_key }));
    }

    if (row?.s3_3d_key) {
        await s3Client.send(new S3.DeleteObjectCommand({ Bucket: bucketName, Key: row.s3_3d_key }));
    }
}

exports.editTerrain = async (newTerrain, userId) => {
    try {

        await deleteBucketObjects(newTerrain.id);
        await pool.query(`
        UPDATE terrains
        SET seed = $1, size = $2, heightScale = $3, octaves = $4, iterations = $5, user_id = $6, s3_3d_key = NULL, s3_2d_key = NULL
        WHERE id = $7
        `, [newTerrain.seed, newTerrain.size, newTerrain.heightScale, newTerrain.octaves, newTerrain.iterations, userId, newTerrain.id]);

        return new Terrain(newTerrain.seed, newTerrain.size, newTerrain.heightScale, newTerrain.octaves, newTerrain.iterations, newTerrain.id, userId);

    } catch (err) {
        console.error('Error in editTerrain:', err.message);
    }
}

exports.deleteTerrain = async (id) => {
    try {
        await deleteBucketObjects(id);
        await pool.query('DELETE FROM terrains WHERE id = $1', [id]);

    } catch (err) {
        console.error('Error in deleteTerrain:', err.message);
    }

}

exports.hasTerrain = async (id, userId) => {
    try {
        const result = await pool.query('SELECT 1 FROM terrains WHERE id = $1 AND user_id = $2', [id, userId]);
        return result.rows.length > 0;
    } catch (err) {
        console.error('Error in hasTerrain:', err.message);
    }
}


exports.getAllFromUser = async (userId) => {
    try {
        const result = await pool.query('SELECT * FROM terrains WHERE user_id = $1', [userId]);
        return result.rows.map(row => new Terrain(
            row.seed, row.size, row.heightscale, row.octaves, row.iterations, row.id, row.user_id
        ));
    } catch (err) {
        console.error('Error in getAllFromUser:', err.message);
    }
}

exports.getFromUser = async (id, userId) => {
    try {
        const result = await pool.query('SELECT * FROM terrains WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return new Terrain(row.seed, row.size, row.heightscale, row.octaves, row.iterations, row.id, row.user_id);

    } catch (err) {
        console.error('Error in getFromUser:', err.message);
    }
}

exports.hasHeightMapBucket = async (id) => {
    try {
        const result = await pool.query('SELECT s3_2d_key FROM terrains WHERE id = $1', [id]);
        return result.rows[0]?.s3_2d_key != null;
    } catch (err) {
        console.error('Error in hasHeightMapBucket:', err.message);
    }
}

exports.has3DMapBucket = async (id) => {
    try {
        const result = await pool.query('SELECT s3_3d_key FROM terrains WHERE id = $1', [id]);
        return result.rows[0]?.s3_3d_key != null;
    } catch (err) {
        console.error('Error in has3DMapBucket:', err.message);
    }
}

exports.createHeightMapBucket = async (id, imageBuffer) => {
    try {
        const objectKey = `terrains/heightmaps/terrain-${id}.png`;
        await pool.query('UPDATE terrains SET s3_2d_key = $1 WHERE id = $2', [objectKey, id]);

        await s3Client.send(new S3.PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: imageBuffer,
            ContentType: "image/png",
        }));

        return objectKey;
    } catch (err) {
        console.error('Error in createHeightMapBucket:', err.message);
    }
}

exports.create3DMapBucket = async (id, imageBuffer) => {
    try {
        const objectKey = `terrains/3Dmaps/terrain-${id}.png`;
        await pool.query('UPDATE terrains SET s3_3d_key = $1 WHERE id = $2', [objectKey, id]);

        await s3Client.send(new S3.PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: imageBuffer,
            ContentType: "image/png",
        }));

        return objectKey;
    } catch (err) {
        console.error('Error in createHeightMapBucket:', err.message);
    }
}

exports.getPresignedHeightMapUrl = async (id) => {
    try {
        const result = await pool.query('SELECT s3_2d_key FROM terrains WHERE id = $1', [id]);
        const objectKey = result.rows[0]?.s3_2d_key;

        if (!objectKey) return null;

        const command = new S3.GetObjectCommand({ Bucket: bucketName, Key: objectKey });
        return await S3Presigner.getSignedUrl(s3Client, command, { expiresIn: 3600 });

    } catch (err) {
        console.log(err);
    }
}

exports.getPresigned3DMapUrl = async (id) => {
    try {
        const result = await pool.query('SELECT s3_3d_key FROM terrains WHERE id = $1', [id]);
        const objectKey = result.rows[0]?.s3_3d_key;

        if (!objectKey) return null;

        const command = new S3.GetObjectCommand({ Bucket: bucketName, Key: objectKey });
        return await S3Presigner.getSignedUrl(s3Client, command, { expiresIn: 3600 });

    } catch (err) {
        console.log(err);
    }
}