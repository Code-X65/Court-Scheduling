import express   from 'express'
import cors      from 'cors'
import { authRequired, authOptional, errorHandler } from './middleware/auth.js'
import authRoutes  from './routes/auth.js'
import casesRoutes from './routes/cases.js'
import judgesRoutes from './routes/judges.js'
import courtRoutes from './routes/courtrooms.js'
import usersRoutes from './routes/users.js'
import schedRoutes from './routes/schedules.js'
import hearRoutes  from './routes/hearings.js'
import anaRoutes   from './routes/analytics.js'
import aiRoutes    from './routes/ai.js'
import { getDb }  from './db.js'

const app = express()
const PORT = process.env.PORT || 8001   // separate from json-server on 8000

app.use(cors())
app.use(express.json())

// Public auth endpoint — no auth required
app.use('/login', authRoutes)

// App routes — authOptional for settings/holadays (may be shown conditionally in UI)
app.use('/settings',    authOptional, anaRoutes)
app.use('/audit',       authOptional, anaRoutes)
app.use('/maintenance', authRequired, anaRoutes)

// Protected route namespace
const PROTECTED = express.Router()
PROTECTED.use(authRequired)

PROTECTED.use('/analytics', anaRoutes)
PROTECTED.use('/cases',     casesRoutes)
PROTECTED.use('/judges',    judgesRoutes)
PROTECTED.use('/courtrooms',courtRoutes)
PROTECTED.use('/users',     usersRoutes)
PROTECTED.use('/schedules', schedRoutes)
PROTECTED.use('/hearings',  hearRoutes)
PROTECTED.use('/ai',        aiRoutes)

app.use(PROTECTED)

// SPA fallback (optionally serve static frontend)
// app.use(express.static(path.join(__dirname, '..', 'Frontend', 'dist')))

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Court Scheduling API listening on http://localhost:${PORT}`)
  // warm-up DB to seed on first start
  getDb()
})
