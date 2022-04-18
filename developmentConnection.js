const Pool = require('pg').Pool;

const pool = new Pool({
  user: "postgres",
  password: "postgres",
  database: "facebook",
  host: "localhost",
  port: "5432"
});

module.exports = pool;
