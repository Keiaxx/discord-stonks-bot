const redis = require("redis");
const client = redis.createClient(6379, '192.168.86.133');
module.exports = client;