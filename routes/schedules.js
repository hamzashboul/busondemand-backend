const express = require('express')
const router = express.Router()
const { getMySchedule, addLecture, deleteLecture } = require('../controllers/schedules')
const { verifyToken, verifyRole } = require('../middleware/auth')

router.get('/my', verifyToken, verifyRole('student'), getMySchedule)
router.post('/', verifyToken, verifyRole('student'), addLecture)
router.delete('/:id', verifyToken, verifyRole('student'), deleteLecture)

module.exports = router