const db = require('../config/db')

const getAllBuses = async (req, res) => {
  try {
    const [buses] = await db.query('SELECT * FROM buses')
    res.json(buses)
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const addBus = async (req, res) => {
  try {
    const { bus_number, capacity, driver_name } = req.body

    if (!bus_number || !capacity) {
      return res.status(400).json({ message: 'Bus number and capacity are required' })
    }

    const [result] = await db.query(
      'INSERT INTO buses (bus_number, capacity, driver_name) VALUES (?, ?, ?)',
      [bus_number, capacity, driver_name]
    )

    res.status(201).json({
      message: 'Bus added successfully',
      bus_id: result.insertId
    })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

const updateBus = async (req, res) => {
  try {
    const { id } = req.params
    const { bus_number, capacity, driver_name, is_active } = req.body

    const [result] = await db.query(
      'UPDATE buses SET bus_number=?, capacity=?, driver_name=?, is_active=? WHERE id=?',
      [bus_number, capacity, driver_name, is_active, id]
    )

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Bus not found' })
    }

    res.json({ message: 'Bus updated successfully' })
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { getAllBuses, addBus, updateBus }