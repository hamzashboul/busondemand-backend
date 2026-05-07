const mysql = require('mysql2')

const connectionString = process.env.DATABASE_URL

const pool = mysql.createPool(connectionString)

const db = pool.promise()

db.getConnection()
  .then(() => console.log('Database connected successfully'))
  .catch(err => console.error('Database connection failed:', err.message))

module.exports = db