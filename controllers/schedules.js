const db = require('../config/db')

// Get my schedule
const getMySchedule = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM schedules WHERE student_id = ? ORDER BY FIELD(day, "Sunday","Monday","Tuesday","Wednesday","Thursday"), start_time',
      [req.user.id]
    )
    res.json(rows)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// Add lecture
const addLecture = async (req, res) => {
  const { day, start_time, end_time, subject } = req.body

  if (!day || !start_time || !end_time) {
    return res.status(400).json({ message: 'Day, start time, and end time are required' })
  }

  if (start_time >= end_time) {
    return res.status(400).json({ message: 'End time must be after start time' })
  }

  try {
    // Check for time conflict
    const [conflicts] = await db.query(
      `SELECT * FROM schedules 
       WHERE student_id = ? AND day = ?
       AND (
         (start_time < ? AND end_time > ?) OR
         (start_time < ? AND end_time > ?) OR
         (start_time >= ? AND end_time <= ?)
       )`,
      [req.user.id, day, end_time, start_time, end_time, start_time, start_time, end_time]
    )

    if (conflicts.length > 0) {
      return res.status(400).json({ message: 'This time conflicts with another lecture' })
    }

    const [result] = await db.query(
      'INSERT INTO schedules (student_id, day, start_time, end_time, subject) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, day, start_time, end_time, subject || '']
    )

    res.status(201).json({ message: 'Lecture added successfully', id: result.insertId })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// Delete lecture
const deleteLecture = async (req, res) => {
  const { id } = req.params
  try {
    const [rows] = await db.query(
      'SELECT * FROM schedules WHERE id = ? AND student_id = ?',
      [id, req.user.id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Lecture not found' })
    }

    await db.query('DELETE FROM schedules WHERE id = ?', [id])
    res.json({ message: 'Lecture deleted successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

// Check schedule conflict (used by bookings)
const hasConflict = async (student_id, departure_time) => {
  const date = new Date(departure_time)
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const day = days[date.getDay()]
  const time = date.toTimeString().slice(0, 5)

  const [conflicts] = await db.query(
    `SELECT * FROM schedules 
     WHERE student_id = ? AND day = ?
     AND start_time <= ? AND end_time > ?`,
    [student_id, day, time, time]
  )

  return conflicts.length > 0
}

module.exports = { getMySchedule, addLecture, deleteLecture, hasConflict }