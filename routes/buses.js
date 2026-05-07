const express = require('express')
const router = express.Router()
const { getAllBuses, addBus, updateBus } = require('../controllers/buses')
const { verifyToken, verifyRole } = require('../middleware/auth')

router.get('/', verifyToken, getAllBuses)
router.post('/', verifyToken, verifyRole('admin'), addBus)
router.put('/:id', verifyToken, verifyRole('admin'), updateBus)

module.exports = router