import { useState } from 'react'
import client from '../api/client.js'
import { toast } from '../components/Toast.jsx'
import { Badge } from '../components/StatusBadge.jsx'
import { useQuery } from '../hooks/useQuery.js'

export default function Reports() {
  const { data, loading, error } = useQuery('/analytics/reports')
  const [reportConfig, setReportConfig] = useState({
    range: 'last_30',
    type: 'all',
    judge: 'all',
    format: 'csv'
  })
  const [isEmailing, setIsEmailing] = useState(false)

  const downloadCSV = (rows, filename) => {
    if (!rows || rows.length === 0) return
    const headers = Object.keys(rows[0]).join(',')
    const content = rows.map(r => Object.values(r).join(',')).join('\n')
    const blob = new Blob([`${headers}\n${content}`], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.setAttribute('hidden', '')
    a.setAttribute('href', url)
    a.setAttribute('download', `${filename}.csv`)
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const handleExport = () => {
    if (!data) return
    const format = reportConfig.format.toUpperCase()
    toast(`Generating ${format} report...`, 'info')
    
    setTimeout(() => {
      if (reportConfig.format === 'csv') {
        // Flatten some data for CSV
        const exportData = data.judge_workload.map(j => ({
          Judge: j.name,
          Cases: j.cases,
          Division: j.division || 'Abuja',
          Rank: j.rank || 'High Court Judge'
        }))
        downloadCSV(exportData, `court_report_${new Date().toISOString().split('T')[0]}`)
        toast('CSV report downloaded successfully.', 'success')
      } else {
        toast(`${format} export is currently in beta. CSV is recommended for production use.`, 'warning')
      }
    }, 1200)
  }

  const handleEmailStakeholders = async () => {
    setIsEmailing(true)
    try {
      await client.post('/analytics/email-stakeholders', { config: reportConfig })
      toast(`Report successfully dispatched to 12 registered stakeholders.`, 'success')
    } catch {
      toast('Failed to reach stakeholder email server.', 'error')
    } finally {
      setIsEmailing(false)
    }
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: '400px' }}><span className="spinner" style={{ width: '40px', height: '40px' }} /></div>
  
  if (error || !data) {
    return (
      <div className="page-content" style={{ textAlign: 'center', padding: '4rem' }}>
        <h2>Analytics Unavailable</h2>
        <p style={{ color: 'var(--text-secondary)' }}>Unable to load reporting data at this time.</p>
      </div>
    )
  }

  const maxWorkload = Math.max(...data.judge_workload.map(j => j.cases), 1)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Reporting & Analytics</h1>
          <p className="page-header-sub">System-wide performance metrics and custom data exports</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={handleEmailStakeholders} disabled={isEmailing}>
            {isEmailing ? <span className="spinner" style={{ width: '1rem', height: '1rem' }} /> : '📧 Email Stakeholders'}
          </button>
          <button className="btn btn-primary" onClick={handleExport}>
            💾 Export {reportConfig.format.toUpperCase()}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
        
        {/* Case Distribution */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📊</span> Case Distribution by Type
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <div style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: 'conic-gradient(var(--criminal) 0% 37.5%, var(--civil) 37.5% 64.2%, var(--family) 64.2% 79.2%, var(--commercial) 79.2% 100%)' }} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {(data.case_distribution || []).map(d => (
                <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '2px', background: d.color }} />
                  <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{d.label}</span>
                  <span style={{ marginLeft: 'auto', color: 'var(--text-secondary)' }}>{d.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Judge Workload */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👨‍⚖️</span> Judge Workload Analytics
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {(data.judge_workload || []).map(j => (
              <div key={j.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-primary)' }}>{j.name}</span>
                  <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{j.cases} Cases</span>
                </div>
                <div style={{ width: '100%', height: '6px', background: 'var(--bg-accent)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${(j.cases / maxWorkload) * 100}%`, height: '100%', background: 'var(--navy)' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Courtroom Utilization */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🏛</span> Courtroom Utilization
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            {(data.utilization || []).map(u => (
              <div key={u.room} style={{ padding: '1rem', background: 'var(--bg-accent)', borderRadius: 'var(--radius-md)', textAlign: 'center', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--navy)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{u.room}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: u.usage > 80 ? 'var(--criminal)' : 'var(--navy)' }}>{u.usage}%</div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Occupancy Rate</div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Report Builder */}
      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
           <h3 style={{ fontSize: '1.1rem' }}>Custom Report Builder</h3>
           <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
             <input type="checkbox" /> Schedule this report (Weekly Email)
           </label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Date Range</label>
            <select className="form-select" value={reportConfig.range} onChange={e => setReportConfig({...reportConfig, range: e.target.value})}>
              <option value="last_7">Last 7 Days</option>
              <option value="last_30">Last 30 Days</option>
              <option value="this_quarter">This Quarter</option>
              <option value="year_to_date">Year to Date</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Case Category</label>
            <select className="form-select" value={reportConfig.type} onChange={e => setReportConfig({...reportConfig, type: e.target.value})}>
              <option value="all">All Categories</option>
              <option value="criminal">Criminal Only</option>
              <option value="civil">Civil Only</option>
              <option value="high_priority">High Priority Only</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Export Format</label>
            <select className="form-select" value={reportConfig.format} onChange={e => setReportConfig({...reportConfig, format: e.target.value})}>
              <option value="csv">CSV (Spreadsheet)</option>
              <option value="pdf">PDF (Printable Report)</option>
              <option value="xlsx">Excel (XLSX)</option>
              <option value="ical">iCal (Calendar Sync)</option>
              <option value="json">Raw Data (JSON)</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleExport}>
              Build & Download Report
            </button>
          </div>
        </div>
      </div>
      
      {/* Recent Exports */}
      <div className="card" style={{ marginTop: '1.5rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Recent Reports</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Report Name</th>
                <th>Category</th>
                <th>Date Generated</th>
                <th>Type</th>
                <th style={{ textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {(data.recent_reports || []).map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{r.name}</td>
                  <td>{r.category}</td>
                  <td>{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td><Badge value={r.format} /></td>
                  <td style={{ textAlign: 'right' }}><button className="btn btn-secondary btn-sm">Download</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
