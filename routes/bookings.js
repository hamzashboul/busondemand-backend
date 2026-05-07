const express = require('express')
const router = express.Router()
const { getMyBookings, addBooking, cancelBooking } = require('../controllers/bookings')
const { verifyToken, verifyRole } = require('../middleware/auth')

router.get('/my', verifyToken, verifyRole('student'), getMyBookings)
router.post('/', verifyToken, verifyRole('student'), addBooking)
router.delete('/:id', verifyToken, verifyRole('student'), cancelBooking)

module.exports = router