// redisclient.js
const { createClient } = require('redis');
const REDIS_URL = process.env.REDIS_URL;
const client = createClient({ url: `${REDIS_URL}` });
client.on('error', (err) => console.error('Redis error:', err));

(async () => {
  await client.connect();
})();

module.exports = client;
