const express = require('express')
const router = express.Router()
const { getRoutes } = require('../controllers/routes')
const { verifyToken } = require('../middleware/auth')

router.get('/', verifyToken, getRoutes)

module.exports = router