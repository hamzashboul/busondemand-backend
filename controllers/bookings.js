const { hasConflict } = require('./schedules')
const db = require('../config/db')

let io = null

const setIO = (socketIO) => {
  io = socketIO
}

const getMyBookings = async (req, res) => {
  try {
    const [bookings] = await db.query(`
      SELECT b.*, t.area, t.departure_time, t.status as trip_status,
        t.direction, buses.bus_number
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      JOIN buses ON t.bus_id = buses.id
      WHERE b.student_id = ? AND b.status = 'active'
    `, [req.user.id])

    res.json(bookings)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const addBooking = async (req, res) => {
  try {
    const { trip_id } = req.body
    const student_id = req.user.id

    if (!trip_id) {
      return res.status(400).json({ message: 'Trip ID is required' })
    }

    const [trips] = await db.query(
      'SELECT * FROM trips WHERE id = ? AND status NOT IN (?, ?)',
      [trip_id, 'cancelled', 'completed']
    )

    if (trips.length === 0) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    const trip = trips[0]

    // Check schedule conflict
    const conflict = await hasConflict(req.user.id, trip.departure_time)
    if (conflict) {
      return res.status(400).json({
        message: 'You have a lecture at this time. Please check your schedule.'
      })
    }

    if (trip.direction !== 'from_university') {
      return res.status(400).json({ message: 'Booking only allowed for trips from university' })
    }

    const [timeConflict] = await db.query(`
      SELECT b.id FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      WHERE b.student_id = ? 
        AND b.status = 'active'
        AND t.departure_time = ?
        AND t.status != 'cancelled'
    `, [student_id, trip.departure_time])

    if (timeConflict.length > 0) {
      return res.status(400).json({ message: 'You already have a booking at this time' })
    }

    const [busInfo] = await db.query(
      'SELECT capacity FROM buses WHERE id = ?',
      [trip.bus_id]
    )

    const [bookedSeats] = await db.query(
      'SELECT COUNT(*) as count FROM bookings WHERE trip_id = ? AND status = ?',
      [trip_id, 'active']
    )

    const capacity = busInfo[0].capacity
    const booked = bookedSeats[0].count

    if (booked >= capacity) {
      return res.status(400).json({ message: 'Bus is full' })
    }

   const ip_address = req.headers['x-forwarded-for']?.split(',')[0].trim() || 
                   req.socket.remoteAddress || 
                   'unknown'

    const [result] = await db.query(
      'INSERT INTO bookings (student_id, trip_id, ip_address) VALUES (?, ?, ?)',
      [student_id, trip_id, ip_address]
    )

    const newBooked = booked + 1
    const justConfirmed = newBooked >= capacity / 2

    if (justConfirmed) {
      const [wasAlreadyConfirmed] = await db.query(
        'SELECT status FROM trips WHERE id = ?',
        [trip_id]
      )

      if (wasAlreadyConfirmed[0].status === 'pending') {
        await db.query(
          'UPDATE trips SET status = ?, confirmed_at = NOW() WHERE id = ?',
          ['confirmed', trip_id]
        )

        // Get all students booked on this trip
        const [students] = await db.query(`
          SELECT b.student_id, u.name
          FROM bookings b
          JOIN users u ON b.student_id = u.id
          WHERE b.trip_id = ? AND b.status = 'active'
        `, [trip_id])

        // Send notification to each student via Socket.io
        if (io) {
          students.forEach(student => {
            io.to(`student_${student.student_id}`).emit('trip_confirmed', {
              trip_id,
              area: trip.area,
              departure_time: trip.departure_time,
              message: `🎉 Your trip to ${trip.area} has been confirmed!`
            })
          })
        }
      }
    }

    res.status(201).json({
      message: 'Booking successful',
      booking_id: result.insertId,
      seats_remaining: capacity - newBooked
    })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params
    const student_id = req.user.id

    const [result] = await db.query(
      'UPDATE bookings SET status = ? WHERE id = ? AND student_id = ?',
      ['cancelled', id, student_id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Booking not found' })
    }

    res.json({ message: 'Booking cancelled successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { getMyBookings, addBooking, cancelBooking, setIO }