const { createClient } = require('redis');
const REDIS_URL = process.env.REDIS_URL;

const client = createClient({ 
  url: `${REDIS_URL}`, 
  socket: {
    connectTimeout: 10000,  // Increase timeout to 10 seconds
  }
});

client.on('error', (err) => console.error('Redis error:', err));

(async () => {
  await client.connect();
})();
