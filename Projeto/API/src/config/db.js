/* LIGAÇÃO DO FRONT E BACK COM O SQL */

const mysql = require('mysql2');
require('dotenv').config();

// substituimos cada campo la do .env em forma de variáveis em js
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  timezone: 'Z'
});

module.exports = pool.promise();