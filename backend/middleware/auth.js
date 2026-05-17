import { getDb } from '../db.js'
import bcrypt from 'bcryptjs'

/**
 * Verify Basic Auth credentials from the Authorization header
 * Passes req.user on success or calls next(err) on failure.
 */
export function authRequired(req, res, next) {
  const header = req.headers.authorization || ''
  const m = header.match(/^Basic\s+(.+)$/i)
  if (!m) return authError(res, 'No credentials provided')

  const decoded = Buffer.from(m[1], 'base64').toString()
  const [username, password] = decoded.split(':')
  if (!username || !password) return authError(res, 'Invalid credentials format')

  const db = getDb()
  const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username)
  if (!row) return authError(res, 'Invalid username or password')

  const ok = bcrypt.compareSync(password, row.password_hash)
  if (!ok) return authError(res, 'Invalid username or password')

  // update last login
  db.prepare("UPDATE users SET last_login = datetime('now') WHERE id = ?").run(row.id)

  req.user = { id: row.id, username: row.username, fullName: row.full_name, role: row.role }
  next()
}

function authError(res, message) {
  return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message } })
}

/**
 * Optional auth – sets req.user if credentials are present and valid,
 * otherwise passes through without error.
 */
export function authOptional(req, res, next) {
  const header = req.headers.authorization || ''
  const m = header.match(/^Basic\s+(.+)$/i)
  if (!m) { req.user = null; return next() }

  const decoded = Buffer.from(m[1], 'base64').toString()
  const [username, password] = decoded.split(':')
  if (!username || !password) { req.user = null; return next() }

  try {
    const db = getDb()
    const row = db.prepare('SELECT * FROM users WHERE username = ? AND is_active = 1').get(username)
    if (!row) { req.user = null; return next() }

    const ok = bcrypt.compareSync(password, row.password_hash)
    if (!ok) { req.user = null; return next() }

    req.user = { id: row.id, username: row.username, fullName: row.full_name, role: row.role }
  } catch { req.user = null }
  next()
}

/**
 * Error handler – formats all thrown errors as { detail } to match
 * what the frontend reads in `e.response?.data?.detail`
 */
export function errorHandler(err, req, res, _next) {
  console.error(err)
  const status = err.status || 500
  const message = err.message || 'Internal Server Error'
  res.status(status).json({ success: false, error: { code: 'ERROR', message, detail: message } })
}
