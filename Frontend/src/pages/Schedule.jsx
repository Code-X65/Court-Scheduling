import { useState, useEffect } from 'react'
import client from '../api/client.js'
import ScheduleGrid from '../components/ScheduleGrid.jsx'
import ConflictMatrix from '../components/ConflictMatrix.jsx'
import { Badge, PriorityDot } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'
import { useAuth } from '../context/AuthContext.jsx'

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
  const [viewMode, setViewMode]     = useState('grid') // 'grid' | 'matrix'
  const [filterType, setFilterType] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [options, setOptions]         = useState({
    optimization_goal: 'density', // 'density' | 'spread'
    buffer_minutes: 15,
    max_hearings_per_day: 6,
    prioritize_urgent: true
  })
  const [isPublishing, setIsPublishing] = useState(false)
   const { user } = useAuth()
   const role = user?.role || 'admin'

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
      const r = await client.post('/schedules/generate', {
        week_start_date: weekStart,
        case_ids: selectedIds,
        options: options
      })
      setResult(r.data)
      setActiveHearings(r.data.hearings)
      toast(`Draft schedule generated — ${r.data.scheduled_count} hearing${r.data.scheduled_count !== 1 ? 's' : ''} created.`)
      if (r.data.unscheduled_count > 0) toast(`${r.data.unscheduled_count} case${r.data.unscheduled_count !== 1 ? 's' : ''} could not be scheduled.`, 'warning')
      // Refresh runs list
      client.get('/schedules').then(r2 => setRuns(r2.data)).catch(() => {})
      // Refresh pending cases
      client.get('/cases?status=pending').then(r2 => { setPendingCases(r2.data); setSelectedIds(r2.data.map(c => c.id)) }).catch(() => {})
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to generate schedule.', 'error')
    } finally { setLoading(false) }
  }

  const handlePublish = async () => {
    if (!result) return
    setIsPublishing(true)
    try {
      await client.post(`/schedules/${result.id}/publish`)
      toast('Schedule published successfully!', 'success')
      // Refresh
      client.get('/schedules').then(r2 => setRuns(r2.data)).catch(() => {})
      setResult(null)
      setActiveHearings([])
    } catch (e) {
      toast('Failed to publish schedule.', 'error')
    } finally { setIsPublishing(false) }
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

  const filteredCases = pendingCases.filter(c => {
    if (filterType !== 'all' && c.case_type !== filterType) return false
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false
    if (searchQuery && !c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) && !c.title.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  const sortedCases = [...filteredCases].sort((a, b) => {
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
        {[['generate', role === 'judge' ? 'Current Schedule' : 'Generate Schedule'],['history','History']].map(([k, label]) => (
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
                <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>📅</span> Target Scheduling Week
                </h3>
                <div className="form-group">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input className="form-input" type="date" value={weekStart} onChange={e => handleDateChange(e.target.value)}
                      min={new Date().toISOString().split('T')[0]} style={{ maxWidth: '180px' }} />
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--navy)' }}>
                       Week {new Date(weekStart).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })} - {new Date(new Date(weekStart).getTime() + 4 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <span className="form-help">Algorithm will align hearings to Monday-Friday of this week.</span>
                </div>
              </div>

              {/* Algorithm Options */}
              {role !== 'judge' && (
                <div className="card" style={{ padding: '1.25rem 1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem' }}>AI Algorithm Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div className="form-group">
                      <label className="form-label">Optimization Goal</label>
                      <select className="form-select" value={options.optimization_goal} onChange={e => setOptions({...options, optimization_goal: e.target.value})}>
                        <option value="density">Maximize Density (Fill Days)</option>
                        <option value="spread">Even Spread (Balance Workload)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Buffer Between Hearings (Min)</label>
                      <input className="form-input" type="number" value={options.buffer_minutes} onChange={e => setOptions({...options, buffer_minutes: parseInt(e.target.value)}) } />
                    </div>
                    <label className="checkbox-pill">
                      <input type="checkbox" checked={options.prioritize_urgent} onChange={e => setOptions({...options, prioritize_urgent: e.target.checked})} />
                      Prioritize Urgent Cases
                    </label>
                  </div>
                </div>
              )}

              {/* Case checklist */}
              {role !== 'judge' && (
                <div className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <h3 style={{ fontSize: '0.9rem', marginBottom: '0.15rem' }}>Cases to Schedule</h3>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selectedIds.length} of {filteredCases.length} selected</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSelectedIds(filteredCases.map(c => c.id))}>Select All</button>
                      <button className="btn btn-secondary btn-sm" onClick={deselectAll}>Deselect All</button>
                    </div>
                  </div>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-accent)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <input
                      className="form-input"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.6rem' }}
                      placeholder="Search case number or title..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', flex: 1 }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value="all">All Types</option>
                        <option value="criminal">Criminal</option>
                        <option value="civil">Civil</option>
                        <option value="family">Family</option>
                        <option value="commercial">Commercial</option>
                        <option value="land">Land</option>
                        <option value="constitutional">Constitutional</option>
                      </select>
                      <select className="form-select" style={{ fontSize: '0.75rem', padding: '0.3rem 0.5rem', flex: 1 }} value={filterPriority} onChange={e => setFilterPriority(e.target.value)}>
                        <option value="all">All Priorities</option>
                        <option value="urgent">Urgent</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                      </select>
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
              )}

              {role !== 'judge' && (
                <button
                  className="btn btn-primary"
                  style={{ justifyContent: 'center', padding: '0.75rem', position: 'relative', overflow: 'hidden' }}
                  disabled={loading || selectedIds.length === 0}
                  onClick={handleGenerate}
                >
                  {loading ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="spinner spinner-white" />
                      <span>Optimizing Schedule...</span>
                    </div>
                  ) : `Generate Schedule (${selectedIds.length} cases)`}
                </button>
              )}
            </div>
          )}

          {/* Right / full panel — results */}
          <div style={{ position: 'relative' }}>
            {loading && (
              <div className="card animate-in" style={{
                position: 'absolute', inset: 0, zIndex: 100, background: 'var(--bg-secondary)', opacity: 0.9, backdropFilter: 'blur(4px)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2rem'
              }}>
                <div className="spinner" style={{ width: '48px', height: '48px', borderWidth: '3px', marginBottom: '1.5rem' }} />
                <h2 style={{ marginBottom: '0.5rem' }}>AI Scheduler is Thinking</h2>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '300px' }}>Analyzing judge availability, courtroom capacity, and case priorities to find the optimal arrangement...</p>
              </div>
            )}
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
                  <div style={{ flex: 1 }} />
                  <div className="radio-group no-print">
                    <label className="radio-pill">
                      <input type="radio" checked={viewMode === 'grid'} onChange={() => setViewMode('grid')} />
                      Grid View
                    </label>
                    <label className="radio-pill">
                      <input type="radio" checked={viewMode === 'matrix'} onChange={() => setViewMode('matrix')} />
                      Conflict Matrix
                    </label>
                  </div>
                  {role !== 'judge' && (
                    <button className="btn btn-primary" onClick={handlePublish} disabled={isPublishing}>
                      {isPublishing ? <span className="spinner spinner-white" /> : 'Publish Schedule'}
                    </button>
                  )}
                  {role !== 'judge' && (
                    <button className="btn btn-secondary btn-sm" onClick={() => { setResult(null); setActiveHearings([]) }}>
                      Discard Draft
                    </button>
                  )}
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

                {/* Grid or Matrix */}
                <div className="animate-in">
                  {viewMode === 'grid' ? (
                    <div className="card" style={{ padding: '1.25rem' }}>
                      <ScheduleGrid hearings={activeHearings} weekStart={weekStart || result?.week_start_date} onStatusChange={() => {
                        if (activeRun) loadRun(activeRun)
                      }} />
                    </div>
                  ) : (
                    <ConflictMatrix hearings={activeHearings} weekStart={weekStart || result?.week_start_date} />
                  )}
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
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {runsLoading ? Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7}><div className="skeleton" /></td></tr>
                )) : runs.length === 0 ? (
                  <tr><td colSpan={7}><div className="table-empty"><p>No schedule runs yet.</p></div></td></tr>
                ) : runs.map(r => (
                  <tr key={r.id}>
                    <td style={{ fontWeight: 600 }}>{r.week_start_date}</td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{new Date(r.generated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                    <td><span style={{ fontWeight: 600, color: 'var(--family)' }}>{r.scheduled_count}</span></td>
                    <td><span style={{ fontWeight: 600, color: r.unscheduled_count > 0 ? 'var(--commercial)' : 'var(--text-muted)' }}>{r.unscheduled_count}</span></td>
                    <td><span style={{ fontWeight: 600, color: r.conflict_count > 0 ? 'var(--criminal)' : 'var(--family)' }}>{r.conflict_count}</span></td>
                    <td><Badge value={r.status || 'draft'} /></td>
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
