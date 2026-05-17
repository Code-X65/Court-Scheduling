import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// GET /schedules — history list
router.get('/schedules', (req, res) => {
  const db = getDb()
  const rows = db.prepare(
    'SELECT id, week_start_date, generated_at, scheduled_count, unscheduled_count, conflict_count, status, options FROM schedules ORDER BY id DESC'
  ).all()
  for (const row of rows) { row.options = JSON.parse(row.options || '{}') }
  res.json({ success: true, data: rows })
})

// GET /schedules/:id — single schedule with hearings
router.get('/schedules/:id', (req, res) => {
  const db = getDb()
  const sched = db.prepare('SELECT * FROM schedules WHERE id = ?').get(Number(req.params.id))
  if (!sched) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found.' } })

  const hearings = db.prepare(
    'SELECT * FROM hearings WHERE scheduled_date >= ? ORDER BY scheduled_date, start_time'
  ).all(sched.week_start_date)

  res.json({ success: true, data: { id: sched.id, week_start_date: sched.week_start_date, generated_at: sched.generated_at, scheduled_count: sched.scheduled_count, unscheduled_count: sched.unscheduled_count, conflict_count: sched.conflict_count, status: sched.status, options: JSON.parse(sched.options || '{}'), hearings } })
})

// POST /schedules/generate
router.post('/schedules/generate', (req, res) => {
  const db = getDb()
  const { week_start_date, case_ids, options } = req.body

  if (!week_start_date || !Array.isArray(case_ids) || case_ids.length === 0) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'week_start_date and case_ids are required.' } })
  }

  const JUDGE_COLORS = ['#186BA6','#820233','#0A3069','#2D4059','#89216B','#004B8D','#6B2C91','#00A676']
  const DAYS      = ['Monday','Tuesday','Wednesday','Thursday','Friday']
  const COURT_HRS = [9, 10, 11, 12, 13, 14, 15, 16]

  // Fetch active judges and courtrooms
  const judgesRows = db.prepare('SELECT id, name, specializations, available_days, max_hearings_per_day FROM judges WHERE is_active = 1').all()
  const judges = judgesRows.map(j => ({ ...j, specializations: JSON.parse(j.specializations || '[]'), available_days: JSON.parse(j.available_days || '[]') }))

  const roomRows = db.prepare('SELECT id, name, capacity FROM courtrooms WHERE is_active = 1').all()

  // Day-to-date mapping
  const strt = new Date(week_start_date)
  const weekDates = {}
  DAYS.forEach((d, i) => { const dt = new Date(strt); dt.setDate(dt.getDate() + i); weekDates[d] = dt.toISOString().split('T')[0] })

  // Case load
  const casesRows = db.prepare(
    `SELECT c.*, j.name as judge_name FROM cases c LEFT JOIN judges j ON c.assigned_judge_id = j.id WHERE c.id IN (${'?'.repeat(case_ids.length).split('').join(',')})`
  ).all(...case_ids)

  // --- Conflict detection helper ---
  function slotTaken(schedule, date, startTime) {
    return schedule.hearings.some(h => h.scheduled_date === date && h.start_time === startTime)
  }

  // Simple load check per judge/day
  function getJudgeDayCount(schedule, judgeId, date) {
    return schedule.hearings.filter(h => h.assigned_judge_id === judgeId && h.scheduled_date === date).length
  }

  function getRoomDayCount(schedule, roomId, date) {
    return schedule.hearings.filter(h => h.courtroom_id === roomId && h.scheduled_date === date).length
  }

  // End minutes from start
  function endFrom(startMin, dur) { return (startMin + dur) / 60 }

  // Map number -> "HH:MM"
  function asTime(h, m = 0) { return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}` }

  // Detect judge + room conflicts in schedule
  function detectConflicts(schedule) {
    let conflicts = 0
    const judgeSlots = {}  // judgeId+date+startTime -> [hearingId]
    const roomSlots  = {}  // roomId+date+startTime   -> [hearingId]
    schedule.hearings.forEach(h => {
      const jk = `${h.assigned_judge_id}|${h.scheduled_date}|${h.start_time}`
      judgeSlots[jk] = judgeSlots[jk] || []; judgeSlots[jk].push(h.id)
      const rk = `${h.courtroom_id}|${h.scheduled_date}|${h.start_time}`
      roomSlots[rk]  = roomSlots[rk]  || []; roomSlots[rk].push(h.id)
    })
    Object.values(judgeSlots).filter(ids => ids.length > 1).forEach(() => conflicts++)
    Object.values(roomSlots).filter(ids => ids.length > 1).forEach(() => conflicts++)
    return conflicts
  }

  const schedule = { hearings: [] }
  const unscheduled = []

  // Priority map
  const PRIO = { urgent: 0, normal: 1, low: 2 }
  const sortedCases = [...casesRows].sort((a, b) => (PRIO[a.priority] ?? 1) - (PRIO[b.priority] ?? 1))

  const maxPerDay = options?.max_hearings_per_day || 5

  for (const c of sortedCases) {
    let placed = false

    for (const day of DAYS) {
      const judge = judges.find(j => j.id === c.assigned_judge_id)
      if (!judge) break
      if (!judge.available_days.includes(day.toLowerCase())) continue

      // Find a courtroom (round-robin by day, prefer least used)
      let room = null
      for (const r of roomRows) {
        if (getRoomDayCount(schedule, r.id, weekDates[day]) < maxPerDay) { room = r; break }
      }
      if (!room) continue

      // Find an available time slot
      const judgeLoad = getJudgeDayCount(schedule, judge.id, weekDates[day])
      if (judgeLoad >= judge.max_hearings_per_day) continue

      for (const h of COURT_HRS) {
        const startTime = asTime(h)
        if (slotTaken(schedule, weekDates[day], startTime)) continue
        // 30-min slot for short cases, 90 for normal
        const dur = c.priority === 'urgent' ? 30 : 90
        placed = true

        const color = JUDGE_COLORS[judge.id % JUDGE_COLORS.length]
        schedule.hearings.push({
          id:            c.id,
          case_id:       c.id,
          case_number:   c.case_number,
          title:         c.title,
          case_type:     c.case_type,
          assigned_judge_id: c.assigned_judge_id,
          judge_name:    c.judge_name || '',
          courtroom_id:  room.id,
          courtroom_name: room.name,
          scheduled_date: weekDates[day],
          start_time:    startTime,
          end_time:      asTime(h, dur === 30 ? 30 : 90),
          duration_prediction: dur,
          confidence:    +(0.7 + Math.random() * 0.3).toFixed(2),
          status:        'scheduled',
          color
        })
        break
      }
      if (placed) break
    }
    if (!placed) unscheduled.push({ case_id: c.id, case_number: c.case_number, reason: 'No available slot this week' })
  }

  schedule.conflict_count = detectConflicts(schedule)

  const schedInfo = db.prepare(
    `INSERT INTO schedules (week_start_date, generated_at, scheduled_count, unscheduled_count, conflict_count, status, options)
     VALUES (?,datetime('now'),?,?,?,?,?)`
  ).run(
    week_start_date,
    schedule.hearings.length,
    unscheduled.length,
    schedule.conflict_count,
    'draft',
    JSON.stringify(options || {})
  )
  schedule.id = schedInfo.lastInsertRowid

  // Insert hearings
  const insH = db.prepare(
    `INSERT INTO hearings (case_id, case_number, title, case_type, assigned_judge_id, judge_name, courtroom_id, courtroom_name, scheduled_date, start_time, end_time, duration_prediction, confidence, status)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
  )
  for (const h of schedule.hearings) {
    insH.run(h.case_id, h.case_number, h.title, h.case_type, h.assigned_judge_id, h.judge_name, h.courtroom_id, h.courtroom_name, h.scheduled_date, h.start_time, h.end_time, h.duration_prediction, h.confidence, h.status)
  }

  // Update case statuses
  db.prepare("UPDATE cases SET status = 'scheduled' WHERE id IN (" + schedule.hearings.map((_, i) => `?`).join(',') + ")")
    .run(...schedule.hearings.map(h => h.case_id))

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'GENERATE_SCHEDULE', `week:${week_start_date}`)

  res.json({
    success: true,
    data: {
      id: schedule.id,
      week_start_date: week_start_date,
      generated_at: new Date().toISOString(),
      scheduled_count: schedule.hearings.length,
      unscheduled_count: unscheduled.length,
      conflict_count: schedule.conflict_count,
      status: 'draft',
      hearings: schedule.hearings,
      unscheduled_cases: unscheduled
    }
  })
})

// POST /schedules/:id/publish
router.post('/schedules/:id/publish', (req, res) => {
  const db = getDb()
  const id = Number(req.params.id)
  const row = db.prepare('SELECT * FROM schedules WHERE id = ?').get(id)
  if (!row) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Schedule not found.' } })

  db.prepare("UPDATE schedules SET status = 'published', generated_at = datetime('now') WHERE id = ?").run(id)

  db.prepare("INSERT INTO audit_logs (user, action, target, time) VALUES (?,?,?,datetime('now'))")
    .run(req.user?.username || 'system', 'PUBLISH_SCHEDULE', `schedule:${id}`)

  res.json({ success: true, data: { id, status: 'published' } })
})

export default router
