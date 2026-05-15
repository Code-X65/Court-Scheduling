import { useState, useEffect } from 'react'
import client from '../api/client.js'
import ScheduleGrid from '../components/ScheduleGrid.jsx'
import { Badge, PriorityDot } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'

function getNextMonday() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 1 ? 7 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

function toMonday(dateStr) {
  const d = new Date(dateStr)
  const day = d.getDay()
  const diff = day === 0 ? 1 : day === 1 ? 0 : -(day - 1)
  d.setDate(d.getDate() + diff)
  return d.toISOString().split('T')[0]
}

export default function Schedule() {
  const [weekStart, setWeekStart]   = useState(getNextMonday())
  const [pendingCases, setPendingCases] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading]       = useState(false)
  const [casesLoading, setCasesLoading] = useState(true)
  const [result, setResult]         = useState(null)
  const [runs, setRuns]             = useState([])
  const [runsLoading, setRunsLoading] = useState(true)
  const [activeRun, setActiveRun]   = useState(null)
  const [activeHearings, setActiveHearings] = useState([])
  const [tab, setTab]               = useState('generate') // 'generate' | 'history'

  useEffect(() => {
    client.get('/cases?status=pending').then(r => { setPendingCases(r.data); setSelectedIds(r.data.map(c => c.id)) }).catch(() => {}).finally(() => setCasesLoading(false))
    client.get('/schedules').then(r => setRuns(r.data)).catch(() => {}).finally(() => setRunsLoading(false))
  }, [])

  const handleDateChange = (val) => {
    const mon = toMonday(val)
    if (mon !== val) toast('Date adjusted to Monday for that week.', 'info')
    setWeekStart(mon)
  }

  const toggleCase = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const selectAll  = () => setSelectedIds(pendingCases.map(c => c.id))
  const deselectAll = () => setSelectedIds([])

  const handleGenerate = async () => {
    if (selectedIds.length === 0) { toast('Select at least one case.', 'warning'); return }
    setLoading(true); setResult(null)
    try {
      const r = await client.post('/schedules/generate', { week_start_date: weekStart, case_ids: selectedIds })
      setResult(r.data)
      setActiveHearings(r.data.hearings)
      toast(`Schedule generated — ${r.data.scheduled_count} hearing${r.data.scheduled_count !== 1 ? 's' : ''} created.`)
      if (r.data.unscheduled_count > 0) toast(`${r.data.unscheduled_count} case${r.data.unscheduled_count !== 1 ? 's' : ''} could not be scheduled.`, 'warning')
      // Refresh runs list
      client.get('/schedules').then(r2 => setRuns(r2.data)).catch(() => {})
      // Refresh pending cases
      client.get('/cases?status=pending').then(r2 => { setPendingCases(r2.data); setSelectedIds(r2.data.map(c => c.id)) }).catch(() => {})
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to generate schedule.', 'error')
    } finally { setLoading(false) }
  }

  const loadRun = async (run) => {
    setActiveRun(run)
    try {
      const r = await client.get(`/schedules/${run.id}`)
      setActiveHearings(r.data.hearings)
      setResult(r.data)
      setTab('generate')
    } catch { toast('Failed to load schedule.', 'error') }
  }

  const sortedCases = [...pendingCases].sort((a, b) => {
    const p = { urgent: 0, normal: 1, low: 2 }
    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1)
  })

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Schedule</h1>
          <p className="page-header-sub">Generate and view weekly hearing schedules</p>
        </div>
        {result && (
          <button className="btn btn-secondary no-print" onClick={() => window.print()}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="1" y="4" width="12" height="7" rx="1" stroke="currentColor" strokeWidth="1.4"/><path d="M4 4V2h6v2M4 10v2h6v-2" stroke="currentColor" strokeWidth="1.4"/></svg>
            Print Schedule
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid var(--border)' }} className="no-print">
        {[['generate','Generate Schedule'],['history','History']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '0.6rem 1.25rem', background: 'none', border: 'none', borderBottom: tab === k ? '2px solid var(--navy)' : '2px solid transparent',
            marginBottom: '-2px', fontWeight: tab === k ? 600 : 400, color: tab === k ? 'var(--navy)' : 'var(--text-secondary)',
            fontSize: '0.875rem', cursor: 'pointer', transition: 'color 160ms',
          }}>{label}</button>
        ))}
      </div>

      {tab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr' : '380px 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left panel - only show if no result or regenerating */}
          {!result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Week picker */}
              <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>Week Starting</h3>
                <div className="form-group">
                  <input className="form-input" type="date" value={weekStart} onChange={e => handleDateChange(e.target.value)}
                    min={new Date().toISOString().split('T')[0]} style={{ maxWidth: '200px' }} />
                  <span className="form-help">Automatically adjusted to Monday</span>
                </div>
              </div>

              {/* Case checklist */}
              <div className="card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h3 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>Cases to Schedule</h3>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedIds.length} of {pendingCases.length} selected</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button className="btn btn-secondary btn-sm" onClick={selectAll}>Select All</button>
                    <button className="btn btn-secondary btn-sm" onClick={deselectAll}>Deselect All</button>
                  </div>
                </div>
                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                  {casesLoading ? (
                    <div className="spinner-center"><span className="spinner" /></div>
                  ) : pendingCases.length === 0 ? (
                    <div className="table-empty"><p>No pending cases.</p></div>
                  ) : sortedCases.map(c => (
                    <label key={c.id} style={{
                      display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1.25rem',
                      borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background 160ms',
                    }}
                      onMouseOver={e => e.currentTarget.style.background = 'var(--navy-light)'}
                      onMouseOut={e => e.currentTarget.style.background = ''}
                    >
                      <input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleCase(c.id)}
                        style={{ marginTop: '3px', accentColor: 'var(--navy)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', fontWeight: 700, color: 'var(--navy)' }}>{c.case_number}</span>
                          <Badge value={c.case_type} />
                          <PriorityDot priority={c.priority} />
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{c.assigned_judge_name || 'No judge'}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-primary"
                style={{ justifyContent: 'center', padding: '0.75rem' }}
                disabled={loading || selectedIds.length === 0}
                onClick={handleGenerate}
              >
                {loading ? <><span className="spinner spinner-white" /> Generating Schedule…</> : `Generate Schedule (${selectedIds.length} cases)`}
              </button>
            </div>
          )}

          {/* Right / full panel — results */}
          <div>
            {result && (
              <div className="animate-in">
                {/* Stats bar */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }} className="no-print">
                  <div className="info-box info-box-green" style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700 }}>✓</span>
                    <span><strong>{result.scheduled_count}</strong> hearings scheduled</span>
                  </div>
                  {result.conflict_count === 0 ? (
                    <div className="info-box info-box-green" style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700 }}>✓</span>
                      <span>0 conflicts detected</span>
                    </div>
                  ) : (
                    <div className="info-box info-box-red" style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700 }}>⚠</span>
                      <span><strong>{result.conflict_count}</strong> conflicts detected!</span>
                    </div>
                  )}
                  {result.unscheduled_count > 0 && (
                    <div className="info-box info-box-amber" style={{ flex: 1 }}>
                      <span style={{ fontWeight: 700 }}>⚠</span>
                      <span><strong>{result.unscheduled_count}</strong> cases unscheduled</span>
                    </div>
                  )}
                  <button className="btn btn-secondary btn-sm" onClick={() => { setResult(null); setActiveHearings([]) }}>
                    ← Back to Generate
                  </button>
                </div>

                {/* Unscheduled */}
                {result.unscheduled_cases?.length > 0 && (
                  <div className="card no-print" style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
                    <h3 style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--commercial)' }}>Unscheduled Cases</h3>
                    {result.unscheduled_cases.map(u => (
                      <div key={u.case_id} style={{ display: 'flex', gap: '0.75rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.82rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--navy)' }}>{u.case_number}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{u.reason}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Grid */}
                <div className="card" style={{ padding: '1.25rem' }}>
                  <ScheduleGrid hearings={activeHearings} weekStart={weekStart || result?.week_start_date} onStatusChange={() => {
                    if (activeRun) loadRun(activeRun)
                  }} />
                </div>
              </div>
            )}
            {!result && !loading && (
              <div className="card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>📅</div>
                <p>Select cases and click <strong>Generate Schedule</strong> to create this week's hearing timetable.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Week Starting</th>
                  <th>Generated At</th>
                  <th>Scheduled</th>
                  <th>Unscheduled</th>
                  <th>Conflicts</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runsLoading ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={6}><div className="skeleton" /></td></tr>
                )) : runs.length === 0 ? (
                  <tr><td colSpan={6}><div className="table-empty"><p>No schedule runs yet.</p></div></td></tr>
                ) : runs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.week_start_date}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{new Date(r.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td><span style={{ fontWeight: 600, color: 'var(--family)' }}>{r.scheduled_count}</span></td>
                    <td><span style={{ fontWeight: 600, color: r.unscheduled_count > 0 ? 'var(--commercial)' : 'var(--text-muted)' }}>{r.unscheduled_count}</span></td>
                    <td><span style={{ fontWeight: 600, color: r.conflict_count > 0 ? 'var(--criminal)' : 'var(--family)' }}>{r.conflict_count}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => { loadRun(r); setTab('generate') }}>
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
