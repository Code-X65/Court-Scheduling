import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// GET /courtrooms
router.get('/courtrooms', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM courtrooms ORDER BY id').all()
  for (const row of rows) {
    row.equipment = JSON.parse(row.equipment || '[]')
  }
  res.json({ success: true, data: rows })
})

// GET /courtrooms/:id
router.get('/courtrooms/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM courtrooms WHERE id = ?').get(Number(req.params.id))
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Courtroom not found.' } })
  row.equipment = JSON.parse(row.equipment || '[]')
  res.json({ success: true, data: row })
})

// POST /courtrooms
router.post('/courtrooms', (req, res) => {
  const db = getDb()
  const { name, capacity, location, equipment } = req.body
  if (!name || !capacity) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Name and capacity are required.' } })
  }

  const info = db.prepare(
    `INSERT INTO courtrooms (name, capacity, location, equipment, is_active)
     VALUES (?,?,?,?,1)`
  ).run(name, Number(capacity), location || '', JSON.stringify(equipment || []))

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'CREATE_COURTROOM', `courtroom:${name}`)

  const row = db.prepare('SELECT * FROM courtrooms WHERE id = ?').get(info.lastInsertRowid)
  row.equipment = JSON.parse(row.equipment || '[]')
  res.status(201).json({ success: true, data: row })
})

// PUT /courtrooms/:id
router.put('/courtrooms/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM courtrooms WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Courtroom not found.' } })

  const { name, capacity, location, equipment, is_active } = req.body
  db.prepare(
    `UPDATE courtrooms SET
       name=COALESCE(?, name), capacity=COALESCE(?, capacity),
       location=COALESCE(?, location), equipment=COALESCE(?, equipment), is_active=COALESCE(?, is_active)
     WHERE id = ?`
  ).run(
    name,
    capacity ? Number(capacity) : null,
    location,
    equipment ? JSON.stringify(equipment) : null,
    is_active,
    id
  )

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'UPDATE_COURTROOM', `courtroom:${existing.name}`)

  const row = db.prepare('SELECT * FROM courtrooms WHERE id = ?').get(id)
  row.equipment = JSON.parse(row.equipment || '[]')
  res.json({ success: true, data: row })
})

// PUT /courtrooms/:id toggles is_active (activate/deactivate used by frontend)
// DELETE /courtrooms/:id — deactivate (frontend calls deleteCourtroom → DELETE)
router.delete('/courtrooms/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM courtrooms WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Courtroom not found.' } })

  db.prepare('UPDATE courtrooms SET is_active = 0 WHERE id = ?').run(id)
  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'DEACTIVATE_COURTROOM', `courtroom:${existing.name}`)

  const row = db.prepare('SELECT * FROM courtrooms WHERE id = ?').get(id)
  row.equipment = JSON.parse(row.equipment || '[]')
  res.json({ success: true, data: row })
})

export default router
