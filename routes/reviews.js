const express = require('express')
const router = express.Router()
const { addReview, getTripReviews, getAllReviews } = require('../controllers/reviews')
const { verifyToken, verifyRole } = require('../middleware/auth')

router.post('/', verifyToken, verifyRole('student'), addReview)
router.get('/trip/:trip_id', verifyToken, getTripReviews)
router.get('/all', verifyToken, verifyRole('admin'), getAllReviews)

module.exports = router