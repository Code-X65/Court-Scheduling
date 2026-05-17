import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// GET /judges
router.get('/judges', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM judges ORDER BY id DESC').all()
  for (const row of rows) {
    row.specializations = JSON.parse(row.specializations || '[]')
    row.available_days  = JSON.parse(row.available_days  || '[]')
  }
  res.json({ success: true, data: rows })
})

// GET /judges/:id
router.get('/judges/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM judges WHERE id = ?').get(Number(req.params.id))
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Judge not found.' } })
  row.specializations = JSON.parse(row.specializations || '[]')
  row.available_days  = JSON.parse(row.available_days  || '[]')
  res.json({ success: true, data: row })
})

// POST /judges
router.post('/judges', (req, res) => {
  const db = getDb()
  const { name, email, phone, rank, gender, division, specializations, available_days, max_hearings_per_day } = req.body
  if (!name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name is required.' } })

  const info = db.prepare(
    `INSERT INTO judges (name, email, phone, rank, gender, division, specializations, available_days, max_hearings_per_day)
     VALUES (?,?,?,?,?,?,?,?,?)`
  ).run(
    name, email || '', phone || '', rank || 'High Court Judge', gender || 'Male',
    division || 'Abuja',
    JSON.stringify(specializations || []), JSON.stringify(available_days || []),
    max_hearings_per_day || 4
  )

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'CREATE_JUDGE', `judge:${name}`)

  const row = db.prepare('SELECT * FROM judges WHERE id = ?').get(info.lastInsertRowid)
  row.specializations = JSON.parse(row.specializations || '[]')
  row.available_days  = JSON.parse(row.available_days  || '[]')
  res.status(201).json({ success: true, data: row })
})

// PUT /judges/:id
router.put('/judges/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM judges WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Judge not found.' } })

  const { name, email, phone, rank, gender, division, specializations, available_days, max_hearings_per_day, is_active } = req.body
  db.prepare(
    `UPDATE judges SET
       name=COALESCE(?, name), email=COALESCE(?, email), phone=COALESCE(?, phone),
       rank=COALESCE(?, rank), gender=COALESCE(?, gender), division=COALESCE(?, division),
       specializations=COALESCE(?, specializations), available_days=COALESCE(?, available_days),
       max_hearings_per_day=COALESCE(?, max_hearings_per_day), is_active=COALESCE(?, is_active)
     WHERE id = ?`
  ).run(
    name, email, phone, rank, gender, division,
    specializations ? JSON.stringify(specializations) : null,
    available_days  ? JSON.stringify(available_days)   : null,
    max_hearings_per_day, is_active, id
  )

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'UPDATE_JUDGE', `judge:${existing.name}`)

  const row = db.prepare('SELECT * FROM judges WHERE id = ?').get(id)
  row.specializations = JSON.parse(row.specializations || '[]')
  row.available_days  = JSON.parse(row.available_days  || '[]')
  res.json({ success: true, data: row })
})

// DELETE /judges/:id
router.delete('/judges/:id', (req, res) => {
  const db = getDb()
  const id  = Number(req.params.id)
  const row = db.prepare('SELECT * FROM judges WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Judge not found.' } })

  db.prepare('DELETE FROM judges WHERE id = ?').run(id)
  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'DELETE_JUDGE', `judge:${row.name}`)

  res.json({ success: true, data: { id } })
})

export default router
