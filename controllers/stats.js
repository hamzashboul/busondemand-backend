const db = require('../config/db')

const getStats = async (req, res) => {
  try {
    const [totalTrips] = await db.query(
      'SELECT COUNT(*) as count FROM trips WHERE is_archived = 0'
    )

    const [confirmedTrips] = await db.query(
      'SELECT COUNT(*) as count FROM trips WHERE status = ? AND is_archived = 0',
      ['confirmed']
    )

    const [pendingTrips] = await db.query(
      'SELECT COUNT(*) as count FROM trips WHERE status = ? AND is_archived = 0',
      ['pending']
    )

    const [totalBookings] = await db.query(
      'SELECT COUNT(*) as count FROM bookings WHERE status = ?',
      ['active']
    )

    const [popularArea] = await db.query(`
      SELECT t.area, COUNT(b.id) as booking_count
      FROM bookings b
      JOIN trips t ON b.trip_id = t.id
      WHERE b.status = 'active'
      AND t.is_archived = 0
      GROUP BY t.area
      ORDER BY booking_count DESC
      LIMIT 1
    `)

    const [tripStats] = await db.query(`
      SELECT t.id, t.area, t.departure_time, t.status,
        b.bus_number, b.capacity,
        COUNT(bk.id) as booked_seats,
        ROUND((COUNT(bk.id) / b.capacity) * 100, 1) as fill_percentage
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      LEFT JOIN bookings bk ON t.id = bk.trip_id AND bk.status = 'active'
      WHERE t.is_archived = 0
      GROUP BY t.id
      ORDER BY t.departure_time DESC
    `)

    res.json({
      total_trips: totalTrips[0].count,
      confirmed_trips: confirmedTrips[0].count,
      pending_trips: pendingTrips[0].count,
      total_bookings: totalBookings[0].count,
      most_popular_area: popularArea[0] || null,
      trip_stats: tripStats
    })

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { getStats }