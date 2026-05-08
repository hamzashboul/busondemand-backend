require('dotenv').config()
const express = require('express')
const cors = require('cors')
const http = require('http')
const cron = require('node-cron')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')

const db = require('./config/db')
const { Server } = require('socket.io')

const authRoutes = require('./routes/auth')
const busRoutes = require('./routes/buses')
const tripRoutes = require('./routes/trips')
const bookingRoutes = require('./routes/bookings')
const statsRoutes = require('./routes/stats')
const reviewRoutes = require('./routes/reviews')
const scheduleRoutes = require('./routes/schedules')

const { setIO } = require('./controllers/bookings')

const app = express()
app.set('trust proxy', 1)
const server = http.createServer(app)

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
})

// Pass io to bookings controller
setIO(io)

// Security
app.use(helmet())

// CORS
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://busondemand.vercel.app',
    'https://busondemand-frontend.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}))

// Rate Limiting — عام
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: 'Too many requests, please try again later.' }
})
app.use('/api/', limiter)

// Rate Limiting — تسجيل الدخول
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: 'Too many login attempts, please try again later.' }
})
app.use('/api/auth/', authLimiter)

app.use(express.json())

// Auto-archive cron job
cron.schedule('0 * * * *', async () => {
  try {
    const [result] = await db.query(`
      UPDATE trips 
      SET is_archived = 1 
      WHERE is_archived = 0 
      AND departure_time < DATE_SUB(NOW(), INTERVAL 48 HOUR)
    `)
    if (result.affectedRows > 0) {
      console.log(`Auto-archived ${result.affectedRows} trip(s)`)
    }
  } catch (error) {
    console.error('Auto-archive error:', error.message)
  }
})

io.on('connection', (socket) => {
  console.log('User connected:', socket.id)

  socket.on('join_student', (student_id) => {
    socket.join(`student_${student_id}`)
    console.log(`Student ${student_id} joined notifications room`)
  })

  socket.on('join_trip', (trip_id) => {
    socket.join(`trip_${trip_id}`)
    console.log(`User joined trip: ${trip_id}`)
  })

  socket.on('update_location', async (data) => {
    const { trip_id, driver_id, latitude, longitude } = data
    try {
      await db.query(
        'INSERT INTO locations (trip_id, driver_id, latitude, longitude) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE latitude=?, longitude=?, updated_at=NOW()',
        [trip_id, driver_id, latitude, longitude, latitude, longitude]
      )
      io.to(`trip_${trip_id}`).emit('bus_location', {
        trip_id, latitude, longitude, updated_at: new Date()
      })
    } catch (error) {
      console.error('Location update error:', error.message)
    }
  })

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id)
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/buses', busRoutes)
app.use('/api/trips', tripRoutes)
app.use('/api/bookings', bookingRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/schedules', scheduleRoutes)

app.get('/', (req, res) => {
  res.json({ message: 'BusOnDemand API is running! 🚌' })
})

const PORT = process.env.PORT || 3000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

module.exports = { app, server }