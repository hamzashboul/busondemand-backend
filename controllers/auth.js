const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../config/db')

const login = async (req, res) => {
  try {
    const { university_id, password } = req.body

   if (!university_id) {
  return res.status(400).json({ message: 'University ID is required' })
}
if (!password) {
  return res.status(400).json({ message: 'Password is required' })
}

    const [users] = await db.query(
      'SELECT * FROM users WHERE university_id = ?',
      [university_id]
    )

    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const user = users[0]

    const isMatch = await bcrypt.compare(password, user.password_hash)
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    )
res.json({
  token,
  role: user.role,
  name: user.name,
  id: user.id,
  message: 'Login successful'
})

  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message })
  }
}

module.exports = { login }