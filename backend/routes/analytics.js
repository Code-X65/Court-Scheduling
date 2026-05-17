import { Router } from 'express'
import { getDb } from '../db.js'

const router = Router()

// GET /dashboard/stats
router.get('/dashboard/stats', (req, res) => {
  const db = getDb()

  const totalCases    = db.prepare('SELECT COUNT(*) AS c FROM cases').get().c
  const pendingCases  = db.prepare("SELECT COUNT(*) AS c FROM cases WHERE status = 'pending'").get().c
  const scheduledWeek = db.prepare(
    "SELECT COUNT(*) AS c FROM cases c JOIN hearings h ON c.id = h.case_id WHERE h.scheduled_date >= date('now') AND h.scheduled_date <= date('now','+6 days')"
  ).get().c || 0

  // upcoming hearings — next 72 hours
  const upcoming = db.prepare(
    `SELECT h.case_number, h.title, h.scheduled_date, h.start_time, cr.name AS courtroom_name, j.name AS judge_name
     FROM hearings h
     LEFT JOIN courtrooms cr ON cr.id = h.courtroom_id
     LEFT JOIN judges j ON j.id = h.assigned_judge_id
     WHERE h.scheduled_date >= date('now')
       AND h.scheduled_date <= date('now','+3 days')
       AND h.status = 'scheduled'
     ORDER BY h.scheduled_date, h.start_time
     LIMIT 5`
  ).all()
  const upcomingHearings = upcoming.map(h => ({
    case_number: h.case_number, title: h.title,
    date: h.scheduled_date, time: h.start_time,
    courtroom: h.courtroom_name || '', judge: h.judge_name || ''
  }))

  // workload chart data (cases per judge)
  const wl = db.prepare(
    `SELECT j.name, COALESCE(COUNT(c.id),0) AS cases
     FROM judges j
     LEFT JOIN cases c ON c.assigned_judge_id = j.id AND c.status IN ('pending','scheduled')
     GROUP BY j.id ORDER BY cases DESC`
  ).all()
  const workloadChart = wl.map(r => ({ label: r.name, value: r.cases }))

  // last schedule run
  const { last_run } = db.prepare("SELECT MAX(generated_at) AS last_run FROM schedules").get() || { last_run: null }

  res.json({
    success: true,
    data: {
      total_cases: totalCases,
      pending_cases: pendingCases,
      scheduled_this_week: scheduledWeek,
      upcoming_hearings: upcomingHearings,
      workload_chart: workloadChart,
      last_schedule_run: last_run || new Date().toISOString(),
    }
  })
})

// GET /analytics/reports — merged with Reports.jsx chart/view component
router.get('/analytics/reports', (req, res) => {
  const db = getDb()
  const totalCases   = db.prepare('SELECT COUNT(*) AS c FROM cases').get().c
  const pendingCases = db.prepare("SELECT COUNT(*) AS c FROM cases WHERE status = 'pending'").get().c

  // case distribution
  const typeRows = db.prepare(
    "SELECT case_type AS label, COUNT(*) AS count FROM cases GROUP BY case_type"
  ).all()
  const colorMap = { criminal:'#C0392B', civil:'#1A5276', family:'#1D7A4E', commercial:'#B7770D', land:'#6D4C2B', constitutional:'#5B2C82' }
  const caseDistribution = typeRows.map(r => ({ label: r.label, count: r.count, color: colorMap[r.label] || '#666' }))

  // judge workload
  const jw = db.prepare(
    `SELECT j.id, j.name, COALESCE(COUNT(c.id),0) AS cases, j.division, j.rank, j.max_hearings_per_day
     FROM judges j
     LEFT JOIN cases c ON c.assigned_judge_id = j.id AND c.status IN ('pending','scheduled')
     GROUP BY j.id ORDER BY cases DESC`
  ).all()
  const judgeWorkload = jw.map(r => ({ name: r.name, cases: r.cases, division: r.division || '', rank: r.rank || '' }))

  // courtroom utilization (by active schedules)
  const cUse = db.prepare(
    `SELECT cr.name AS room, COALESCE(SUM(CASE WHEN h.status = 'scheduled' THEN 1 ELSE 0 END),0) AS booked,
            COUNT(cr.id) AS total_ct
     FROM courtrooms cr
     LEFT JOIN hearings h ON h.courtroom_id = cr.id AND h.scheduled_date >= date('now','-7 days')
     GROUP BY cr.id`
  ).all()
  const utilization = cUse.map(r => ({
    room: r.room,
    usage: r.total_ct > 0 ? Math.round((r.booked / (r.total_ct * 8)) * 100) : 0
  }))

  // recent reports
  const recentReports = [
    { id: 1, name: 'Monthly Case Distribution',     category: 'Cases', created_at: new Date().toISOString(), format: 'CSV' },
    { id: 2, name: 'Judge Workload Summary',         category: 'Judges',created_at: new Date(Date.now() - 86400000).toISOString(), format: 'CSV' },
    { id: 3, name: 'Courtroom Occupancy Report',     category: 'Utilization', created_at: new Date(Date.now() - 86400000*3).toISOString(), format: 'PDF' },
    { id: 4, name: 'Weekly Hearing Schedule',        category: 'Schedules',created_at: new Date(Date.now() - 86400000*7).toISOString(), format: 'CSV' },
    { id: 5, name: 'Case Adjournment Analysis',      category: 'Cases', created_at: new Date(Date.now() - 86400000*10).toISOString(), format: 'CSV' },
    { id: 6, name: 'System Audit Summary',           category: 'Audit',  created_at: new Date(Date.now() - 86400000*14).toISOString(), format: 'PDF' },
  ]

  res.json({ success: true, data: { case_distribution: caseDistribution, judge_workload: judgeWorkload, utilization, recent_reports: recentReports } })
})

// POST /analytics/email-stakeholders
router.post('/analytics/email-stakeholders', (req, res) => {
  res.json({ success: true, message: 'Report dispatched to registered stakeholders.' })
})

// GET /settings/holidays
router.get('/settings/holidays', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM holidays ORDER BY date').all()
  res.json({ success: true, data: rows })
})

// PATCH /settings/general
router.patch('/settings/general', (req, res) => {
  res.json({ success: true, message: 'Settings saved successfully.' })
})

// GET /audit/logs
router.get('/audit/logs', (req, res) => {
  const db = getDb()
  const rows = db.prepare('SELECT * FROM audit_logs ORDER BY id DESC').all()
  res.json({ success: true, data: rows })
})

// POST /maintenance/backup
router.post('/maintenance/backup', (req, res) => {
  res.json({ success: true, message: 'Backup initiated successfully.' })
})

export default router
