const memjs = require('memjs');
const MEMCACHED_URL = process.env.MEMCACHED_URL;

const client = memjs.Client.create(MEMCACHED_URL);

client.set('test-key', 'value', { expires: 1 }, (err, val) => {
  if (err) {
    console.error('Memcached connection error:', err);
  } else {
    console.log('Memcached client initialized successfully');
  }
});

module.exports = client;
