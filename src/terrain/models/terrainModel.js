const pool = require('../data/db');
const S3 = require("@aws-sdk/client-s3");
const S3Presigner = require("@aws-sdk/s3-request-presigner");
const Terrain = require("../data/Terrain");

const bucketName = process.env.S3_BUCKET;
// const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

const { defaultProvider } = require("@aws-sdk/credential-provider-node");
const { fromNodeProviderChain } = require("@aws-sdk/credential-providers");


(async () => {
    try {
        const creds = await defaultProvider()();
        console.log("AWS credentials:", {
            accessKeyId: creds.accessKeyId,
            secretAccessKeySet: !!creds.secretAccessKey,
            sessionTokenSet: !!creds.sessionToken,
            expiration: creds.expiration,
        });
    } catch (err) {
        console.error("Failed to load AWS credentials:", err);
    }
})();


exports.addTerrain = async (seed, size, heightScale, octaves, iterations, style, userId) => {
    try {
        const result = await pool.query(`
            INSERT INTO terrains (seed, size, heightScale, octaves, iterations, style, user_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id
        `, [seed, size, heightScale, octaves, iterations, style, userId]);

        return new Terrain(Number(seed), size, heightScale, octaves, iterations, result.rows[0].id, userId, style);
    } catch (err) {
        console.error('Error in addTerrain:', err.message);
        throw err;
    }
}

async function deleteBucketObjects(id) {
    const result = await pool.query(
        'SELECT s3_2d_key, s3_3d_key FROM terrains WHERE id = $1', [id]
    );
    const row = result.rows[0];

    const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

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
        SET seed = $1, size = $2, heightScale = $3, octaves = $4, iterations = $5, style = $6, user_id = $7, s3_3d_key = NULL, s3_2d_key = NULL
        WHERE id = $8
        `, [newTerrain.seed, newTerrain.size, newTerrain.heightScale, newTerrain.octaves, newTerrain.iterations, newTerrain.style, userId, newTerrain.id]);

        return new Terrain(newTerrain.seed, newTerrain.size, newTerrain.heightScale, newTerrain.octaves, newTerrain.iterations, newTerrain.id, userId, newTerrain.style);

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
        throw err;
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
        const result = await pool.query('SELECT * FROM terrains WHERE user_id = $1 ORDER BY id', [userId]);
        if (result.rows.length === 0) return [];
        console.log("getAllFromUser result:", result.rows[0].style);
        return result.rows.map(row => new Terrain(
            row.seed, row.size, row.heightscale, row.octaves, row.iterations, row.id, row.user_id, row.style
        ));
    } catch (err) {
        console.error('Error in getAllFromUser:', err.message);
        throw err;
    }
}

exports.getFromUser = async (id, userId) => {
    try {
        const result = await pool.query('SELECT * FROM terrains WHERE id = $1 AND user_id = $2', [id, userId]);
        if (result.rows.length === 0) return null;

        const row = result.rows[0];
        return new Terrain(row.seed, row.size, row.heightscale, row.octaves, row.iterations, row.id, row.user_id, row.style);

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
    const objectKey = `terrains/heightmaps/terrain-${id}.png`;

    try {
        await pool.query('UPDATE terrains SET s3_2d_key = $1 WHERE id = $2', [objectKey, id]);
        console.log("About to connect");
        const s3Client = new S3.S3Client({
            region: 'ap-southeast-2',
            credentials: fromNodeProviderChain(), // Explicitly resolves credentials
        });
        console.log("Connected successfully");

        const creds = await s3Client.config.credentials();
        console.log("Loaded AWS credentials:", creds);

        console.log("About to put");
        const putResult = await s3Client.send(new S3.PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: imageBuffer,
            ContentType: "image/png",
        }));
        console.log("Put successfully");

        console.log("S3 upload success:", putResult);

        return objectKey;
    } catch (err) {
        console.error('Error in createHeightMapBucket:', err.message);
        try {
            console.error(`Failed to upload to S3.
                Bucket: ${bucketName}
                Key: ${objectKey}
                Buffer size: ${imageBuffer.length}
                User ID: ${id}
            `);
        } catch (logErr) {
            console.error('Error while logging additional info:', logErr.message);
        }
        throw err;
    }
}

exports.create3DMapBucket = async (id, imageBuffer) => {
    try {
        const objectKey = `terrains/3Dmaps/terrain-${id}.png`;
        await pool.query('UPDATE terrains SET s3_3d_key = $1 WHERE id = $2', [objectKey, id]);
        const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

        const putResult = await s3Client.send(new S3.PutObjectCommand({
            Bucket: bucketName,
            Key: objectKey,
            Body: imageBuffer,
            ContentType: "image/png",
        }));

        console.log("S3 upload success:", putResult);

        return objectKey;
    } catch (err) {
        console.error('Error in create3DMapBucket:', err.message);
        console.error(`Failed to upload to S3.
            Bucket: ${bucketName}
            Key: ${objectKey}
            Buffer size: ${imageBuffer.length}
            User ID: ${id}
            `);
        throw err;
    }
};

exports.getPresignedHeightMapUrl = async (id) => {
    try {
        const result = await pool.query('SELECT s3_2d_key FROM terrains WHERE id = $1', [id]);
        const objectKey = result.rows[0]?.s3_2d_key;

        if (!objectKey) return null;
        const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

        const command = new S3.GetObjectCommand({ Bucket: bucketName, Key: objectKey });
        return await S3Presigner.getSignedUrl(s3Client, command, { expiresIn: 9000 });

    } catch (err) {
        console.log(err);
    }
}

exports.getPresigned3DMapUrl = async (id) => {
    try {
        const result = await pool.query('SELECT s3_3d_key FROM terrains WHERE id = $1', [id]);
        const objectKey = result.rows[0]?.s3_3d_key;

        if (!objectKey) return null;
        const s3Client = new S3.S3Client({ region: 'ap-southeast-2' });

        const command = new S3.GetObjectCommand({ Bucket: bucketName, Key: objectKey });
        return await S3Presigner.getSignedUrl(s3Client, command, { expiresIn: 3600 });

    } catch (err) {
        console.log(err);
    }
}