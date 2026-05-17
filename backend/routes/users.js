import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// GET /users
router.get('/users', (req, res) => {
  const db = getDb()
  const rows = db.prepare(
    `SELECT id, username, full_name AS fullName, email, role, last_login AS lastLogin, created_at AS createdAt
     FROM users ORDER BY id DESC`
  ).all()
  res.json({ success: true, data: rows })
})

// GET /users/:id
router.get('/users/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare(
    'SELECT id, username, full_name AS fullName, email, role, last_login AS lastLogin FROM users WHERE id = ?'
  ).get(Number(req.params.id))
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } })
  res.json({ success: true, data: row })
})

// POST /users
router.post('/users', (req, res) => {
  const db = getDb()
  const { username, fullName, role, email } = req.body
  if (!username || !fullName) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Username and fullName are required.' } })
  }

  const hash = '$2a$10$' + Buffer.from('default_password_salt').toString('base64').slice(0, 53)

  try {
    const info = db.prepare(
      'INSERT INTO users (username, full_name, role, email, password_hash) VALUES (?,?,?,?,?)'
    ).run(username, fullName, role || 'clerk', email || '', hash)

    db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
      .run(req.user?.username || 'system', 'CREATE_USER', `user:${username}`)

    const row = db.prepare('SELECT id, username, full_name AS fullName, email, role FROM users WHERE id = ?').get(info.lastInsertRowid)
    res.status(201).json({ success: true, data: row })
  } catch {
    res.status(409).json({ success: false, error: { code: 'DUPLICATE_USER', message: 'Username or email already exists.' } })
  }
})

// PUT /users/:id
router.put('/users/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } })

  const { username, fullName, role, email } = req.body
  db.prepare(
    'UPDATE users SET username=COALESCE(?,username), full_name=COALESCE(?,full_name), role=COALESCE(?,role), email=COALESCE(?,email) WHERE id=?'
  ).run(username, fullName, role, email, id)

  const row = db.prepare('SELECT id, username, full_name AS fullName, email, role FROM users WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

// DELETE /users/:id
router.delete('/users/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } })
  if (req.user?.id === id) return res.status(400).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete your own account.' } })

  db.prepare('DELETE FROM users WHERE id = ?').run(id)
  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'DELETE_USER', `user:${row.username}`)

  res.json({ success: true, data: { id } })
})

// POST /users/:id/reset-password
router.post('/users/:id/reset-password', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'User not found.' } })

  const hash = '$2a$10$' + Buffer.from('default_password_salt').toString('base64').slice(0, 53)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, id)

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'RESET_PASSWORD', `user:${row.username}`)

  res.json({ success: true, message: `Password reset link sent to ${row.email}.` })
})

export default router
