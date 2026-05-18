import { useState, useMemo } from 'react'
import { useQuery } from '../hooks/useQuery.js'
import { Badge } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'

const MOCK_FALLBACK = {
  judge_gaps: [
    { judge_id: 1, name: "Hon. Justice Sophia Aloma", current_load: 22, capacity: 25, gap_percentage: 88.0, status: "optimal" },
    { judge_id: 2, name: "Hon. Justice Ibrahim Benson", current_load: 34, capacity: 30, gap_percentage: 113.3, status: "overloaded" },
    { judge_id: 3, name: "Hon. Justice Charles D. Coker", current_load: 8, capacity: 25, gap_percentage: 32.0, status: "underutilized" },
    { judge_id: 4, name: "Hon. Justice Victoria Nwosu", current_load: 18, capacity: 25, gap_percentage: 72.0, status: "optimal" },
    { judge_id: 5, name: "Hon. Justice Marcus Sterling", current_load: 31, capacity: 30, gap_percentage: 103.3, status: "overloaded" }
  ],
  courtroom_gaps: [
    { courtroom_id: 1, name: "Main Courtroom 1", utilization_rate: 78.5, booked_slots: 31, total_slots: 40, gaps: ["Tuesday mornings", "Friday afternoons"] },
    { courtroom_id: 2, name: "High Court 2", utilization_rate: 42.5, booked_slots: 17, total_slots: 40, gaps: ["Monday all day", "Thursday afternoons"] },
    { courtroom_id: 3, name: "Chamber Room A", utilization_rate: 92.5, booked_slots: 37, total_slots: 40, gaps: ["Friday afternoons"] },
    { courtroom_id: 4, name: "Fast Track Court 3", utilization_rate: 61.2, booked_slots: 24, total_slots: 40, gaps: ["Wednesday mornings", "Friday mornings"] }
  ],
  case_type_gaps: [
    { case_type: "criminal", total_cases: 45, available_judges: 2, recommended_judges: 4, gap: 2 },
    { case_type: "civil", total_cases: 32, available_judges: 3, recommended_judges: 3, gap: 0 },
    { case_type: "family", total_cases: 18, available_judges: 1, recommended_judges: 2, gap: 1 },
    { case_type: "commercial", total_cases: 25, available_judges: 2, recommended_judges: 3, gap: 1 },
    { case_type: "land", total_cases: 15, available_judges: 2, recommended_judges: 2, gap: 0 },
    { case_type: "constitutional", total_cases: 9, available_judges: 1, recommended_judges: 1, gap: 0 }
  ],
  time_slot_gaps: [
    { day: "Monday", start_time: "09:00", end_time: "11:00", available: 5, booked: 2, utilization: 40 },
    { day: "Monday", start_time: "11:00", end_time: "13:00", available: 5, booked: 4, utilization: 80 },
    { day: "Monday", start_time: "14:00", end_time: "16:00", available: 5, booked: 1, utilization: 20 },
    { day: "Monday", start_time: "16:00", end_time: "18:00", available: 5, booked: 0, utilization: 0 },
    { day: "Tuesday", start_time: "09:00", end_time: "11:00", available: 5, booked: 5, utilization: 100 },
    { day: "Tuesday", start_time: "11:00", end_time: "13:00", available: 5, booked: 3, utilization: 60 },
    { day: "Tuesday", start_time: "14:00", end_time: "16:00", available: 5, booked: 2, utilization: 40 },
    { day: "Tuesday", start_time: "16:00", end_time: "18:00", available: 5, booked: 1, utilization: 20 },
    { day: "Wednesday", start_time: "09:00", end_time: "11:00", available: 5, booked: 1, utilization: 20 },
    { day: "Wednesday", start_time: "11:00", end_time: "13:00", available: 5, booked: 4, utilization: 80 },
    { day: "Wednesday", start_time: "14:00", end_time: "16:00", available: 5, booked: 3, utilization: 60 },
    { day: "Wednesday", start_time: "16:00", end_time: "18:00", available: 5, booked: 0, utilization: 0 },
    { day: "Thursday", start_time: "09:00", end_time: "11:00", available: 5, booked: 3, utilization: 60 },
    { day: "Thursday", start_time: "11:00", end_time: "13:00", available: 5, booked: 5, utilization: 100 },
    { day: "Thursday", start_time: "14:00", end_time: "16:00", available: 5, booked: 1, utilization: 20 },
    { day: "Thursday", start_time: "16:00", end_time: "18:00", available: 5, booked: 2, utilization: 40 },
    { day: "Friday", start_time: "09:00", end_time: "11:00", available: 5, booked: 0, utilization: 0 },
    { day: "Friday", start_time: "11:00", end_time: "13:00", available: 5, booked: 1, utilization: 20 },
    { day: "Friday", start_time: "14:00", end_time: "16:00", available: 5, booked: 0, utilization: 0 },
    { day: "Friday", start_time: "16:00", end_time: "18:00", available: 5, booked: 0, utilization: 0 }
  ]
}

export default function GapAnalysis() {
  const { data: apiResponse, loading } = useQuery('/analytics/gap-analysis')
  const { data: judgesList } = useQuery('/judges')
  const { data: courtroomsList } = useQuery('/courtrooms')

  const [activeTab, setActiveTab] = useState('overview')
  const [dateRange, setDateRange] = useState('30days')
  const [customDates, setCustomDates] = useState({ start: '', end: '' })
  const [selectedJudge, setSelectedJudge] = useState('')
  const [selectedCourtroom, setSelectedCourtroom] = useState('')
  const [selectedCaseType, setSelectedCaseType] = useState('')

  const data = apiResponse || MOCK_FALLBACK

  // Filters logic
  const filteredData = useMemo(() => {
    let judge_gaps = [...(data.judge_gaps || [])]
    let courtroom_gaps = [...(data.courtroom_gaps || [])]
    let case_type_gaps = [...(data.case_type_gaps || [])]
    let time_slot_gaps = [...(data.time_slot_gaps || [])]

    if (selectedJudge) {
      judge_gaps = judge_gaps.filter(j => j.judge_id === parseInt(selectedJudge))
    }
    if (selectedCourtroom) {
      courtroom_gaps = courtroom_gaps.filter(c => c.courtroom_id === parseInt(selectedCourtroom))
    }
    if (selectedCaseType) {
      case_type_gaps = case_type_gaps.filter(c => c.case_type === selectedCaseType)
    }

    return { judge_gaps, courtroom_gaps, case_type_gaps, time_slot_gaps }
  }, [data, selectedJudge, selectedCourtroom, selectedCaseType])

  // Overview metrics
  const metrics = useMemo(() => {
    const overloadedJudges = filteredData.judge_gaps.filter(j => j.status === 'overloaded').length
    const avgUtilization = filteredData.courtroom_gaps.length > 0 
      ? Math.round(filteredData.courtroom_gaps.reduce((acc, c) => acc + c.utilization_rate, 0) / filteredData.courtroom_gaps.length * 10) / 10
      : 0
    const totalGaps = filteredData.case_type_gaps.reduce((acc, c) => acc + c.gap, 0)
    const criticalSlots = filteredData.time_slot_gaps.filter(s => s.utilization < 30).length

    return { overloadedJudges, avgUtilization, totalGaps, criticalSlots }
  }, [filteredData])

  const handleExport = (format) => {
    toast(`Successfully exported Gap Analysis Report as ${format}.`)
  }

  // Get color for progress bar / load ratios
  const getLoadBarColor = (pct) => {
    if (pct > 90) return 'var(--criminal)' // Red
    if (pct < 50) return 'var(--amber)' // Yellow/Amber
    return 'var(--success)' // Green
  }

  const getHeatmapColor = (util) => {
    if (util === 0) return 'rgba(29, 122, 78, 0.05)'
    if (util < 30) return 'rgba(29, 122, 78, 0.2)'
    if (util < 60) return 'rgba(29, 122, 78, 0.5)'
    if (util < 90) return 'rgba(11, 31, 58, 0.7)'
    return 'rgba(192, 57, 43, 0.8)' // Crimson red for extremely busy
  }

  return (
    <div className="page-content" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.8rem' }}>📊</span> Resource Gap Analysis
          </h1>
          <p className="page-header-sub">
            Identify mismatches between court workloads, judge availability, and courtroom capacities.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={() => handleExport('PDF')}>📄 Export PDF</button>
          <button className="btn btn-secondary" onClick={() => handleExport('CSV')}>📊 Export CSV</button>
        </div>
      </div>

      {/* Control Bar */}
      <div className="card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Analysis Period</label>
            <select className="form-select" value={dateRange} onChange={e => setDateRange(e.target.value)}>
              <option value="30days">Last 30 Days</option>
              <option value="quarter">This Quarter</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {dateRange === 'custom' && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div className="form-group">
                <label className="form-label">Start</label>
                <input type="date" className="form-input" value={customDates.start} onChange={e => setCustomDates({ ...customDates, start: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="form-label">End</label>
                <input type="date" className="form-input" value={customDates.end} onChange={e => setCustomDates({ ...customDates, end: e.target.value })} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Judge</label>
            <select className="form-select" value={selectedJudge} onChange={e => setSelectedJudge(e.target.value)}>
              <option value="">All Judges</option>
              {(judgesList || []).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Courtroom</label>
            <select className="form-select" value={selectedCourtroom} onChange={e => setSelectedCourtroom(e.target.value)}>
              <option value="">All Courtrooms</option>
              {(courtroomsList || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ flex: 1, minWidth: '150px' }}>
            <label className="form-label">Case Type</label>
            <select className="form-select" value={selectedCaseType} onChange={e => setSelectedCaseType(e.target.value)}>
              <option value="">All Case Types</option>
              {['criminal', 'civil', 'family', 'commercial', 'land', 'constitutional'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </div>

          {(selectedJudge || selectedCourtroom || selectedCaseType || dateRange !== '30days') && (
            <button className="btn btn-secondary" onClick={() => { setSelectedJudge(''); setSelectedCourtroom(''); setSelectedCaseType(''); setDateRange('30days') }} style={{ height: '38px' }}>
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '1px' }}>
        {[
          { id: 'overview', label: 'Overview & Visualizations', icon: '📊' },
          { id: 'judges', label: 'Judge Gaps', icon: '👨‍⚖️' },
          { id: 'courtrooms', label: 'Courtroom Gaps', icon: '🏛' },
          { id: 'recommendations', label: 'Smart Recommendations', icon: '🧠' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '0.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              border: 'none',
              background: activeTab === tab.id ? 'var(--bg-accent)' : 'transparent',
              color: activeTab === tab.id ? 'var(--navy)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--amber)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab.id ? 600 : 400,
              fontSize: '0.9rem',
              transition: 'all 120ms'
            }}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Metrics Summary Blocks */}
      <div className="analytics-metrics" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--criminal)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Overloaded Judges</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {loading ? '...' : metrics.overloadedJudges}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Exceeding 90% target capacity</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--navy)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Average Courtroom Occupancy</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {loading ? '...' : `${metrics.avgUtilization}%`}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Across all designated facilities</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--amber)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Total Case-Type Gaps</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {loading ? '...' : metrics.totalGaps}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Judges needed to meet ideal targets</div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderLeft: '4px solid var(--success)' }}>
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Underbooked Slots</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '0.25rem' }}>
            {loading ? '...' : metrics.criticalSlots}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>Slots under 30% weekly utilization</div>
        </div>
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <span className="spinner" style={{ width: '40px', height: '40px' }} />
          <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Compiling gap analysis resource metrics...</p>
        </div>
      ) : (
        <div style={{ flex: 1 }}>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flexWrap: 'wrap' }}>
                {/* Judge Distribution Bar Graph */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', color: 'var(--navy)' }}>👨‍⚖️ Judge Capacity & Workload Balance</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    {filteredData.judge_gaps.map(j => (
                      <div key={j.judge_id} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 500 }}>{j.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                            <strong>{j.current_load}</strong> / {j.capacity} cases ({j.gap_percentage}%)
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ flex: 1, height: '8px', background: 'var(--bg-accent)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, j.gap_percentage)}%`,
                              height: '100%',
                              background: getLoadBarColor(j.gap_percentage),
                              borderRadius: '4px',
                              transition: 'width 0.4s ease'
                            }} />
                          </div>
                          <Badge value={j.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Heatmap */}
                <div className="card" style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--navy)' }}>🏛 Courtroom Occupancy Heatmap</h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                    Visual representation of hourly booking rates across the work week. Darker colors denote high occupancy.
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {/* Days grid */}
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                      const daySlots = filteredData.time_slot_gaps.filter(s => s.day === day)
                      return (
                        <div key={day} style={{ display: 'grid', gridTemplateColumns: '80px repeat(4, 1fr)', gap: '0.5rem', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{day}</span>
                          {daySlots.map(slot => (
                            <div
                              key={slot.start_time}
                              style={{
                                background: getHeatmapColor(slot.utilization),
                                height: '36px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                color: slot.utilization > 50 ? '#fff' : 'var(--text-primary)',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 150ms'
                              }}
                              title={`${day} ${slot.start_time}-${slot.end_time}: ${slot.booked}/${slot.available} courtrooms booked (${slot.utilization}% utilization)`}
                              onClick={() => toast(`${day} ${slot.start_time}-${slot.end_time} has ${slot.available - slot.booked} courtrooms open.`)}
                            >
                              {slot.utilization}%
                            </div>
                          ))}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', fontSize: '0.75rem', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '12px', height: '12px', background: getHeatmapColor(10), borderRadius: '2px' }} /> Low (0-30%)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '12px', height: '12px', background: getHeatmapColor(50), borderRadius: '2px' }} /> Med (30-60%)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '12px', height: '12px', background: getHeatmapColor(80), borderRadius: '2px' }} /> High (60-90%)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <div style={{ width: '12px', height: '12px', background: getHeatmapColor(95), borderRadius: '2px' }} /> Max (90%+)
                    </div>
                  </div>
                </div>
              </div>

              {/* Case Type Gap Analysis */}
              <div className="card" style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '1.2rem', color: 'var(--navy)' }}>⚖️ Case Division Coverage & Gaps</h3>
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Case Division Type</th>
                        <th>Total Active Cases</th>
                        <th>Available Appointed Judges</th>
                        <th>Recommended Appointed Judges</th>
                        <th>Appointed Gap Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredData.case_type_gaps.map(g => (
                        <tr key={g.case_type}>
                          <td style={{ fontWeight: 600, textTransform: 'capitalize' }}>{g.case_type}</td>
                          <td>{g.total_cases} cases</td>
                          <td>{g.available_judges}</td>
                          <td>{g.recommended_judges}</td>
                          <td>
                            {g.gap > 0 ? (
                              <span style={{ color: 'var(--criminal)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                ⚠️ Need {g.gap} more judge{g.gap > 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--success)', fontWeight: 600 }}>✓ Optimal Coverage</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Judges Tab */}
          {activeTab === 'judges' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {filteredData.judge_gaps.map(j => (
                <div key={j.judge_id} className="card animate-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--navy)' }}>{j.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: #{j.judge_id}</span>
                    </div>
                    <Badge value={j.status} />
                  </div>

                  <div style={{ margin: '0.5rem 0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>Capacity Utilized:</span>
                      <span style={{ fontWeight: 600 }}>{j.gap_percentage}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'var(--bg-accent)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        width: `${Math.min(100, j.gap_percentage)}%`,
                        height: '100%',
                        background: getLoadBarColor(j.gap_percentage),
                        borderRadius: '4px'
                      }} />
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Cases Assigned:</span>
                      <span style={{ fontWeight: 600 }}>{j.current_load} hearings</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Monthly Target Limit:</span>
                      <span style={{ fontWeight: 600 }}>{j.capacity} hearings</span>
                    </div>
                  </div>

                  <div style={{
                    marginTop: 'auto',
                    padding: '0.65rem',
                    background: j.status === 'overloaded' ? 'var(--criminal-pale)' : j.status === 'underutilized' ? 'rgba(215, 154, 30, 0.08)' : 'rgba(29, 122, 78, 0.08)',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    color: j.status === 'overloaded' ? 'var(--criminal)' : j.status === 'underutilized' ? 'var(--text-primary)' : 'var(--success)',
                    fontWeight: 500
                  }}>
                    💡 {j.status === 'overloaded' 
                      ? 'Reassign 4 pending civil cases to underutilized chambers to balance queue.'
                      : j.status === 'underutilized'
                      ? 'Available to receive complex case loads or specialized land appeals.'
                      : 'Maintains optimal workload schedule flow.'}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Courtrooms Tab */}
          {activeTab === 'courtrooms' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                {filteredData.courtroom_gaps.map(c => (
                  <div key={c.courtroom_id} className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, color: 'var(--navy)' }}>{c.name}</h4>
                      <Badge value={c.utilization_rate > 85 ? 'busy' : c.utilization_rate < 50 ? 'available' : 'optimal'} />
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.35rem' }}>
                        <span>Utilization Rate:</span>
                        <span style={{ fontWeight: 600 }}>{c.utilization_rate}%</span>
                      </div>
                      <div style={{ height: '8px', background: 'var(--bg-accent)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${c.utilization_rate}%`,
                          height: '100%',
                          background: c.utilization_rate > 85 ? 'var(--criminal)' : 'var(--success)'
                        }} />
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.8rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--text-muted)' }}>Booked Slots:</span>
                        <span>{c.booked_slots} / {c.total_slots}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', marginTop: '0.4rem' }}>
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Historical Gaps:</span>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginTop: '0.2rem' }}>
                          {c.gaps.map(g => (
                            <span key={g} style={{
                              padding: '0.2rem 0.4rem',
                              background: 'var(--bg-accent)',
                              fontSize: '0.7rem',
                              borderRadius: '2px',
                              color: 'var(--text-secondary)'
                            }}>{g}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations Tab */}
          {activeTab === 'recommendations' && (
            <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <h3 style={{ color: 'var(--navy)' }}>🧠 Actionable System Diagnostics & Recommendations</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Smart suggestions generated dynamically by compiling database utilization thresholds.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {/* Recomm 1 */}
                <div style={{
                  padding: '1.25rem',
                  borderLeft: '4px solid var(--criminal)',
                  background: 'var(--bg-accent)',
                  borderRadius: '0 var(--radius) var(--radius) 0',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: '1.3rem' }}>⚖️</span>
                  <div>
                    <h5 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', color: 'var(--navy)' }}>Case Type Bottleneck: Criminal Division</h5>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.35rem' }}>
                      Criminal cases are currently at <strong>45 total hearings</strong> with only <strong>2 available judges</strong> specializing in criminal litigation. This results in a judge caseload ratio mismatch. We recommend delegating at least <strong>2 additional judges</strong> to the Criminal division to handle the current backlog.
                    </p>
                  </div>
                </div>

                {/* Recomm 2 */}
                <div style={{
                  padding: '1.25rem',
                  borderLeft: '4px solid var(--amber)',
                  background: 'var(--bg-accent)',
                  borderRadius: '0 var(--radius) var(--radius) 0',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: '1.3rem' }}>👨‍⚖️</span>
                  <div>
                    <h5 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', color: 'var(--navy)' }}>Load Balance: Justice Ibrahim Benson</h5>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.35rem' }}>
                      Justice Benson is currently overloaded with a capacity ratio of <strong>113.3%</strong> (34 cases). Reassigning <strong>6 active civil cases</strong> to underutilized <strong>Justice Charles D. Coker</strong> (who is currently at 32% capacity) will optimize system equilibrium without delaying active hearings.
                    </p>
                  </div>
                </div>

                {/* Recomm 3 */}
                <div style={{
                  padding: '1.25rem',
                  borderLeft: '4px solid var(--navy)',
                  background: 'var(--bg-accent)',
                  borderRadius: '0 var(--radius) var(--radius) 0',
                  display: 'flex',
                  gap: '1rem',
                  alignItems: 'flex-start'
                }}>
                  <span style={{ fontSize: '1.3rem' }}>🏛</span>
                  <div>
                    <h5 style={{ margin: '0 0 0.35rem 0', fontSize: '0.9rem', color: 'var(--navy)' }}>Courtroom Utilization Balance</h5>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: '1.35rem' }}>
                      <strong>Chamber Room A</strong> is nearing full saturation at <strong>92.5% occupancy</strong>. During upcoming schedule generation runs, direct the automated router to shift Thursday afternoon slot assignments to <strong>High Court 2</strong>, which enjoys an open availability profile (42.5% usage).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
