// redisclient.js
const { createClient } = require('redis');

const client = createClient({ url: 'redis://redis:6379' });
client.on('error', (err) => console.error('Redis error:', err));

(async () => {
  await client.connect();
})();

module.exports = client;

