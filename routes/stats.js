const express = require('express')
const router = express.Router()
const { getStats } = require('../controllers/stats')
const { verifyToken, verifyRole } = require('../middleware/auth')

router.get('/', verifyToken, verifyRole('admin'), getStats)

module.exports = router