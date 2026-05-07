const express = require('express')
const router = express.Router()
const {
  getAllTrips, addTrip, updateTrip, deleteTrip,
  getTripLocation, completeTrip,
  getArchivedTrips, restoreTrip, permanentDeleteTrip
} = require('../controllers/trips')
const { verifyToken, verifyRole } = require('../middleware/auth')

router.get('/', verifyToken, getAllTrips)
router.post('/', verifyToken, verifyRole('admin'), addTrip)
router.put('/:id', verifyToken, verifyRole('admin'), updateTrip)
router.delete('/:id', verifyToken, verifyRole('admin'), deleteTrip)
router.get('/:id/location', verifyToken, getTripLocation)
router.patch('/:id/complete', verifyToken, verifyRole('driver'), completeTrip)
router.get('/archived/all', verifyToken, verifyRole('admin'), getArchivedTrips)
router.patch('/:id/restore', verifyToken, verifyRole('admin'), restoreTrip)
router.delete('/:id/permanent', verifyToken, verifyRole('admin'), permanentDeleteTrip)

module.exports = router