const db = require('../config/db')

const getAllTrips = async (req, res) => {
  try {
    const [trips] = await db.query(`
      SELECT t.*, b.bus_number, b.capacity,
        (SELECT COUNT(*) FROM bookings 
         WHERE trip_id = t.id AND status = 'active') as booked_seats
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      WHERE t.is_archived = 0
    `)
    res.json(trips)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const addTrip = async (req, res) => {
  try {
    const { bus_id, area, departure_time, direction } = req.body

    if (!bus_id || !area || !departure_time || !direction) {
      return res.status(400).json({ message: 'All fields are required' })
    }

    const [result] = await db.query(
      'INSERT INTO trips (bus_id, admin_id, area, departure_time, direction) VALUES (?, ?, ?, ?, ?)',
      [bus_id, req.user.id, area, departure_time, direction]
    )

    res.status(201).json({
      message: 'Trip added successfully',
      trip_id: result.insertId
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const updateTrip = async (req, res) => {
  try {
    const { id } = req.params
    const { bus_id, area, departure_time, status, direction } = req.body

    const [result] = await db.query(
      'UPDATE trips SET bus_id=?, area=?, departure_time=?, status=?, direction=? WHERE id=?',
      [bus_id, area, departure_time, status, direction, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    res.json({ message: 'Trip updated successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const deleteTrip = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      'UPDATE trips SET status = ? WHERE id = ?',
      ['cancelled', id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    res.json({ message: 'Trip cancelled successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getTripLocation = async (req, res) => {
  try {
    const { id } = req.params

    const [location] = await db.query(
      'SELECT * FROM locations WHERE trip_id = ? ORDER BY updated_at DESC LIMIT 1',
      [id]
    )

    if (location.length === 0) {
      return res.status(404).json({ message: 'No location data found for this trip' })
    }

    res.json(location[0])
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const completeTrip = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      'UPDATE trips SET status = ? WHERE id = ? AND status != ?',
      ['completed', id, 'cancelled']
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    res.json({ message: 'Trip completed successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const getArchivedTrips = async (req, res) => {
  try {
    const [trips] = await db.query(`
      SELECT t.*, b.bus_number, b.capacity,
        (SELECT COUNT(*) FROM bookings 
         WHERE trip_id = t.id AND status = 'active') as booked_seats
      FROM trips t
      JOIN buses b ON t.bus_id = b.id
      WHERE t.is_archived = 1
      ORDER BY t.departure_time DESC
    `)
    res.json(trips)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const restoreTrip = async (req, res) => {
  try {
    const { id } = req.params

    const [result] = await db.query(
      'UPDATE trips SET is_archived = 0 WHERE id = ?',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found' })
    }

    res.json({ message: 'Trip restored successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const permanentDeleteTrip = async (req, res) => {
  try {
    const { id } = req.params

    await db.query('DELETE FROM bookings WHERE trip_id = ?', [id])
    await db.query('DELETE FROM locations WHERE trip_id = ?', [id])
    await db.query('DELETE FROM reviews WHERE trip_id = ?', [id])

    const [result] = await db.query(
      'DELETE FROM trips WHERE id = ? AND is_archived = 1',
      [id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Trip not found in archive' })
    }

    res.json({ message: 'Trip permanently deleted' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = {
  getAllTrips, addTrip, updateTrip, deleteTrip,
  getTripLocation, completeTrip,
  getArchivedTrips, restoreTrip, permanentDeleteTrip
}