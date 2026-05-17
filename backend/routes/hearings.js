import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// GET /hearings
router.get('/hearings', (req, res) => {
  const db = getDb()
  const { date, courtroom_id, judge_id } = req.query
  let sql = 'SELECT * FROM hearings'
  const params = []
  const wheres = []

  if (date) { wheres.push('scheduled_date = ?'); params.push(date) }
  if (courtroom_id) { wheres.push('courtroom_id = ?'); params.push(Number(courtroom_id)) }
  if (judge_id) { wheres.push('assigned_judge_id = ?'); params.push(Number(judge_id)) }

  if (wheres.length) sql += ' WHERE ' + wheres.join(' AND ')
  sql += ' ORDER BY scheduled_date, start_time'

  const rows = db.prepare(sql).all(...params)
  res.json({ success: true, data: rows })
})

// PATCH /hearings/:id — partial update (drag-drop reschedule / duration override)
router.patch('/hearings/:id', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM hearings WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Hearing not found.' } })

  const { scheduled_date, start_time, duration_prediction } = req.body
  db.prepare(
    `UPDATE hearings SET
       scheduled_date=COALESCE(?,scheduled_date),
       start_time=COALESCE(?,start_time),
       end_time=COALESCE(?,end_time),
       duration_prediction=COALESCE(?,duration_prediction)
     WHERE id = ?`
  ).run(scheduled_date, start_time,
    duration_prediction ? `${String(9 + Math.floor(duration_prediction / 60)).padStart(2,'0')}:${String(duration_prediction % 60).padStart(2,'0')}` : null,
    duration_prediction, id)

  res.json({ success: true, data: { id } })
})

// PATCH /hearings/:id/status
router.patch('/hearings/:id/status', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const row = db.prepare('SELECT case_number, status FROM hearings WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Hearing not found.' } })

  const { status } = req.body
  if (!['scheduled','completed','adjourned','cancelled'].includes(status)) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status value.' } })
  }

  db.prepare('UPDATE hearings SET status = ? WHERE id = ?').run(status, id)
  // Sync case status if appropriate
  if (status === 'completed' || status === 'adjourned' || status === 'cancelled') {
    db.prepare("UPDATE cases SET status = ? WHERE id NOT IN (SELECT case_id FROM hearings WHERE status = 'scheduled')").run(status)
  }

  res.json({ success: true, data: { id, status } })
})

export default router
