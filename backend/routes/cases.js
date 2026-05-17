import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// GET /cases — supports ?status=, ?judge_id=, ?type=, ?limit=, ?offset=
router.get('/cases', (req, res) => {
  const db = getDb()
  const { status, assigned_judge_id, case_type, limit, offset } = req.query
  let sql = 'SELECT * FROM cases'
  const params = []
  const wheres = []

  if (status) { wheres.push('status = ?'); params.push(status) }
  if (assigned_judge_id) { wheres.push('assigned_judge_id = ?'); params.push(Number(assigned_judge_id)) }
  if (case_type) { wheres.push('case_type = ?'); params.push(case_type) }

  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ')
  sql += ' ORDER BY datetime(created_at) DESC'

  const lim = Number(limit) || 1000
  const off = Number(offset) || 0
  const rows = db.prepare(sql + ' LIMIT ? OFFSET ?').all(...params, lim, off)
  // Map created_at → created_at (already there) plus hydrate judge name
  for (const row of rows) {
    if (row.assigned_judge_id) {
      const j = db.prepare('SELECT name FROM judges WHERE id = ?').get(row.assigned_judge_id)
      if (j) row.assigned_judge_name = j.name
    }
  }
  res.json({ success: true, data: rows })
})

// GET /cases/:id
router.get('/cases/:id', (req, res) => {
  const db = getDb()
  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(Number(req.params.id))
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } })
  if (row.assigned_judge_id) {
    const j = db.prepare('SELECT name FROM judges WHERE id = ?').get(row.assigned_judge_id)
    if (j) row.assigned_judge_name = j.name
  }
  res.json({ success: true, data: row })
})

// POST /cases
router.post('/cases', (req, res) => {
  const db = getDb()
  const { case_number, title, case_type, num_parties, priority, assigned_judge_id, notes, status, assigned_judge_name } = req.body
  if (!case_number || !title || !case_type || !assigned_judge_id) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'case_number, title, case_type, and assigned_judge_id are required.' } })
  }

  let judgeName = assigned_judge_name || ''
  if (!judgeName) {
    const j = db.prepare('SELECT name FROM judges WHERE id = ?').get(Number(assigned_judge_id))
    if (j) judgeName = j.name
  }

  const info = db.prepare(
    `INSERT INTO cases (case_number, title, case_type, num_parties, priority, assigned_judge_id, assigned_judge_name, notes, status, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,datetime('now'))`
  ).run(case_number, title, case_type, num_parties || 2, priority || 'normal', assigned_judge_id, judgeName, notes || '', status || 'pending')

  // audit
  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'CREATE_CASE', `case:${case_number}`)

  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json({ success: true, data: row })
})

// PUT /cases/:id
router.put('/cases/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM cases WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } })

  const { case_number, title, case_type, num_parties, priority, assigned_judge_id, assigned_judge_name, notes, status } = req.body
  if (assigned_judge_id) {
    let jName = assigned_judge_name || ''
    if (!jName) {
      const j2 = db.prepare('SELECT name FROM judges WHERE id = ?').get(Number(assigned_judge_id))
      if (j2) jName = j2.name
    }
    db.prepare(
      `UPDATE cases SET case_number=COALESCE(?,case_number), title=COALESCE(?,title), case_type=COALESCE(?,case_type),
       num_parties=COALESCE(?,num_parties), priority=COALESCE(?,priority), assigned_judge_id=?, assigned_judge_name=?, notes=?, status=?
       WHERE id = ?`
    ).run(case_number, title, case_type, num_parties, priority, assigned_judge_id, jName, notes ?? existing.notes, status ?? existing.status, id)
  } else {
    db.prepare(
      `UPDATE cases SET case_number=COALESCE(?,case_number), title=COALESCE(?,title), case_type=COALESCE(?,case_type),
       num_parties=COALESCE(?,num_parties), priority=COALESCE(?,priority), notes=?, status=?
       WHERE id = ?`
    ).run(case_number, title, case_type, num_parties, priority, notes ?? existing.notes, status ?? existing.status, id)
  }

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'UPDATE_CASE', `case:${existing.case_number}`)

  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

// PATCH /cases/:id — partial update (used for status change)
router.patch('/cases/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const existing = db.prepare('SELECT * FROM cases WHERE id = ?').get(id)
  if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } })

  const { status, priority, notes, assigned_judge_id, assigned_judge_name, case_type, case_number, title, num_parties } = req.body

  if (assigned_judge_id !== undefined && assigned_judge_id !== null) {
    const j = db.prepare('SELECT name FROM judges WHERE id = ?').get(Number(assigned_judge_id))
    db.prepare('UPDATE cases SET assigned_judge_id=?, assigned_judge_name=? WHERE id=?')
      .run(assigned_judge_id, j ? j.name : existing.assigned_judge_name, id)
  }

  db.prepare(
    `UPDATE cases SET
       status=COALESCE(?, status),
       priority=COALESCE(?, priority),
       notes=COALESCE(?, notes),
       case_type=COALESCE(?, case_type),
       case_number=COALESCE(?, case_number),
       title=COALESCE(?, title),
       num_parties=COALESCE(?, num_parties)
     WHERE id = ?`
  ).run(
    status ?? existing.status, priority ?? existing.priority, notes ?? existing.notes,
    case_type ?? existing.case_type, case_number ?? existing.case_number, title ?? existing.title,
    num_parties ?? existing.num_parties, id
  )

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'PATCH_CASE', `case:${existing.case_number}`)

  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id)
  res.json({ success: true, data: row })
})

// DELETE /cases/:id
router.delete('/cases/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM cases WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Case not found.' } })

  db.prepare('DELETE FROM cases WHERE id = ?').run(id)
  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'DELETE_CASE', `case:${row.case_number}`)

  res.json({ success: true, data: { id } })
})

export default router
