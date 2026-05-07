const db = require('../config/db')

const addReview = async (req, res) => {
  try {
    const { trip_id, rating, comment } = req.body
    const student_id = req.user.id

    if (!trip_id || !rating) {
      return res.status(400).json({ message: 'Trip ID and rating are required' })
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' })
    }

    const [booking] = await db.query(
      'SELECT * FROM bookings WHERE student_id = ? AND trip_id = ? AND status = ?',
      [student_id, trip_id, 'active']
    )

    if (booking.length === 0) {
      return res.status(403).json({ message: 'You can only review trips you have booked' })
    }

    const [existing] = await db.query(
      'SELECT * FROM reviews WHERE student_id = ? AND trip_id = ?',
      [student_id, trip_id]
    )

    if (existing.length > 0) {
      return res.status(400).json({ message: 'You have already reviewed this trip' })
    }

    const [result] = await db.query(
      'INSERT INTO reviews (student_id, trip_id, rating, comment) VALUES (?, ?, ?, ?)',
      [student_id, trip_id, rating, comment || null]
    )

    res.status(201).json({
      message: 'Review added successfully',
      review_id: result.insertId
    })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getTripReviews = async (req, res) => {
  try {
    const { trip_id } = req.params

    const [reviews] = await db.query(`
      SELECT r.*, u.name as student_name
      FROM reviews r
      JOIN users u ON r.student_id = u.id
      WHERE r.trip_id = ?
      ORDER BY r.created_at DESC
    `, [trip_id])

    const [avgRating] = await db.query(
      'SELECT ROUND(AVG(rating), 1) as average FROM reviews WHERE trip_id = ?',
      [trip_id]
    )

    res.json({
      reviews,
      average_rating: avgRating[0].average || 0,
      total_reviews: reviews.length
    })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getAllReviews = async (req, res) => {
  try {
    const [reviews] = await db.query(`
      SELECT r.*, u.name as student_name,
        t.area, t.departure_time
      FROM reviews r
      JOIN users u ON r.student_id = u.id
      JOIN trips t ON r.trip_id = t.id
      ORDER BY r.created_at DESC
    `)

    res.json(reviews)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { addReview, getTripReviews, getAllReviews }