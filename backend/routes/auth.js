import { Router } from 'express'
import { getDb } from '../db.js'
import bcrypt from 'bcryptjs'

const router = Router()

// POST /login
router.post('/login', async (req, res) => {
  const { username, password } = req.body
  if (!username || !password) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Username and password are required.' } })
  }

  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username)

  if (!row || !await bcrypt.compare(password, row.password_hash)) {
    return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Invalid username or password.' } })
  }

  const payload = { id: row.id, username: row.username, fullName: row.full_name, role: row.role }
  // Base64 encode for sessionStorage 'auth' field (matching frontend client.js)
  const b64 = Buffer.from(`${username}:${password}`).toString('base64')

  res.json({
    success: true,
    data: {
      user: payload,
      authBase64: b64        // frontend stores this in sessionStorage under 'auth'
    }
  })
})

export default router
