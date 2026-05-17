import { useState } from 'react'
import client from '../api/client.js'
import { toast } from '../components/Toast.jsx'
import { Badge } from '../components/StatusBadge.jsx'
import { useQuery } from '../hooks/useQuery.js'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

export default function Settings() {
  const [tab, setTab] = useState('general') // 'general' | 'notifications' | 'holidays' | 'audit' | 'maintenance'
  const [saving, setSaving] = useState(false)
  
  // Fetch data only for relevant tabs
  const { data: holidays, loading: holidaysLoading } = useQuery('/settings/holidays', { enabled: tab === 'holidays' })
  const { data: auditLogs, loading: auditLoading } = useQuery('/audit/logs', { enabled: tab === 'audit' })

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 500))
      } else {
        await client.patch('/settings/general', { /* form data */ })
      }
      toast('Settings saved successfully.')
    } catch {
      toast('Failed to save settings.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleBackup = async () => {
    toast('Generating system backup...', 'info')
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1200))
      } else {
        await client.post('/maintenance/backup')
      }
      toast('Backup completed. Download started.', 'success')
    } catch {
      toast('Backup failed.', 'error')
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>System Administration</h1>
          <p className="page-header-sub">Global configuration and system maintenance</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', alignItems: 'start' }}>
        {/* Sidebar Tabs */}
        <div className="card" style={{ padding: '0.5rem' }}>
          {[
            { id: 'general', label: 'General Settings', icon: '⚙️' },
            { id: 'notifications', label: 'Notifications', icon: '🔔' },
            { id: 'holidays', label: 'Court Holidays', icon: '📅' },
            { id: 'audit', label: 'Audit Trail', icon: '📜' },
            { id: 'maintenance', label: 'Maintenance', icon: '🛠️' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                width: '100%', padding: '0.875rem 1rem', textAlign: 'left', border: 'none',
                background: tab === t.id ? 'var(--bg-accent)' : 'transparent',
                color: tab === t.id ? 'var(--navy)' : 'var(--text-secondary)',
                fontWeight: tab === t.id ? 600 : 400, borderRadius: '4px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2px',
                transition: 'all 160ms'
              }}
              aria-pressed={tab === t.id}
            >
              <span>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="card" style={{ padding: '2rem', minHeight: '500px' }}>
          
          {tab === 'general' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '1.5rem' }}>General Configuration</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '500px' }}>
                <div className="form-group">
                  <label className="form-label">Institution Name</label>
                  <input className="form-input" defaultValue="Federal High Court of Nigeria" />
                </div>
                <div className="form-group">
                  <label className="form-label">System Timezone</label>
                  <select className="form-select">
                    <option>(GMT+01:00) West Central Africa</option>
                    <option>(GMT+00:00) Greenwich Mean Time</option>
                  </select>
                </div>
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Working Day Start</label>
                    <input className="form-input" type="time" defaultValue="09:00" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Working Day End</label>
                    <input className="form-input" type="time" defaultValue="17:00" />
                  </div>
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start' }}>
                  {saving ? <span className="spinner spinner-white" /> : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {tab === 'notifications' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '1.5rem' }}>Notification Settings</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div className="info-box info-box-amber">
                  <span>ℹ</span> Notification services require active API keys for Twilio and SendGrid.
                </div>
                <label className="checkbox-pill" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked /> Enable Email Notifications (SendGrid)
                </label>
                <label className="checkbox-pill" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                  <input type="checkbox" defaultChecked /> Enable SMS Alerts (Twilio)
                </label>
                <div className="form-group" style={{ maxWidth: '400px' }}>
                  <label className="form-label">Twilio Account SID</label>
                  <input className="form-input" type="password" value="ACxxxxxxxxxxxxxxxxxxxxxxxx" disabled />
                </div>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving} style={{ alignSelf: 'flex-start' }}>Update Provider Keys</button>
              </div>
            </div>
          )}

          {tab === 'holidays' && (
            <div className="animate-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Court Holidays & Closures</h3>
                <button className="btn btn-secondary btn-sm">+ Add Holiday</button>
              </div>
              {holidaysLoading ? <div className="spinner" /> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Holiday Name</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(holidays || []).length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No holidays configured.</td></tr>
                    ) : holidays.map(h => (
                      <tr key={h.id}>
                        <td style={{ fontWeight: 600 }}>{h.name}</td>
                        <td>{new Date(h.date).toLocaleDateString('en-GB', { dateStyle: 'long' })}</td>
                        <td><Badge value="Active" /></td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="btn btn-icon" style={{ color: 'var(--criminal)' }}>🗑</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'audit' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '1.5rem' }}>System Audit Trail</h3>
              {auditLoading ? <div className="spinner" /> : (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>User</th>
                      <th>Action</th>
                      <th>Target Resource</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(auditLogs || []).length === 0 ? (
                      <tr><td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>No audit logs found.</td></tr>
                    ) : auditLogs.map(log => (
                      <tr key={log.id}>
                        <td><span style={{ fontWeight: 600 }}>@{log.user}</span></td>
                        <td>{log.action}</td>
                        <td><code>{log.target}</code></td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {new Date(log.time).toLocaleString('en-GB')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {tab === 'maintenance' && (
            <div className="animate-in">
              <h3 style={{ marginBottom: '1.5rem' }}>System Maintenance</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ padding: '1.5rem', background: 'var(--bg-accent)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>💾</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>Database Backup</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Snapshot current state to secure storage.</p>
                  <button className="btn btn-secondary" onClick={handleBackup}>Run Backup Now</button>
                </div>
                <div style={{ padding: '1.5rem', background: 'var(--bg-accent)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔄</div>
                  <h4 style={{ marginBottom: '0.5rem' }}>System Restore</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Restore from a previous snapshot.</p>
                  <button className="btn btn-secondary" disabled title="Requires super-admin privileges">Restore System</button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
