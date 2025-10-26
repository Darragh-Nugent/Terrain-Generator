const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3 = new S3Client({ region: "ap-southeast-2" });

const { CognitoJwtVerifier } = require('aws-jwt-verify');

const clientId = process.env.CLIENT_ID;
const userPoolId = process.env.USER_POOL_ID;
const SECRET_HEADER_VALUE = process.env.CF_ORIGIN_SECRET; // secret for the CloudFront header
const S3_BUCKET = process.env.S3_BUCKET;

const accessVerifier = CognitoJwtVerifier.create({
  userPoolId,
  tokenUse: 'access',
  clientId,
});

exports.handler = async (event) => {
  try {
    const headers = event.headers || {};

    // Check CloudFront secret
    if (headers['x-cf-secret'] !== SECRET_HEADER_VALUE) {
      return {
        statusCode: 403,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Forbidden: Invalid origin header',
        isBase64Encoded: false
      };
    }

    // Extract token from Authorization header or cookie
    let token = null;
    const authHeader = headers['authorization'] || headers['Authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }
    if (!token && headers.cookie) {
      token = getCookieValue(headers.cookie, 'accessToken');
    }

    if (!token) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Unauthorized: Missing token',
        isBase64Encoded: false
      };
    }

    // Verify
    let decoded;
    try {
      decoded = await accessVerifier.verify(token);
    } catch (err) {
      console.error('JWT verification failed:', err);
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Unauthorized: Invalid or expired token',
        isBase64Encoded: false
      };
    }

    // Determine S3 key
    const path = event.rawPath || event.path || '/index.html';
    let key = path.startsWith('/') ? path.slice(1) : path;
    if (!key.includes('.')) {
      key += '.html';
    }
    console.log(`Fetching from S3 bucket ${S3_BUCKET} key ${key}`);
    // Fetch from S3
    let data;
    try {
      data = await s3.send(new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
      }));
    } catch (s3Err) {
      console.error('S3 getObject failed:', s3Err);
      // Could return 404
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Not Found',
        isBase64Encoded: false
      };
    }
    const body = await streamToString(data.Body);
    // Return success
    return {
      statusCode: 200,
      headers: { 'Content-Type': getContentTypeByFile(key) },
      body,
    };

  } catch (err) {
    console.error('Unhandled error in Lambda:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'text/plain' },
      body: 'Internal Server Error',
      isBase64Encoded: false
    };
  }
};

function getContentTypeByFile(path) {
  if (path.endsWith('.html')) return 'text/html';
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  return 'application/octet-stream';
}

function getCookieValue(cookieHeader, name) {
  const cookies = cookieHeader.split(';').map(c => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return cookie.slice(name.length + 1);
    }
  }
  return null;
}

async function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', chunk => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}
