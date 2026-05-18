import PageSEO from '../seo/PageSEO.jsx'
import { useState } from 'react'
import { useJudges } from '../hooks/useJudges.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'

const SPECIALIZATIONS = ['criminal','civil','family','commercial','land','constitutional']
const DAYS = ['monday','tuesday','wednesday','thursday','friday']

const RANKS = ['Chief Judge', 'High Court Judge', 'Magistrate', 'Senior Advocate']
const GENDERS = ['Male', 'Female', 'Other']
const DIVISIONS = ['Abuja', 'Lagos', 'Kano', 'Port Harcourt', 'Enugu']

const emptyForm = { 
  name: '', 
  email: '', 
  phone: '', 
  rank: 'High Court Judge', 
  gender: 'Male', 
  division: 'Abuja',
  specializations: [], 
  available_days: [], 
  max_hearings_per_day: 4 
}

function validate(form) {
  const errors = {}
  if (!form.name || form.name.trim().length < 3) errors.name = 'Name must be at least 3 characters.'
  if (!form.email || !/^\S+@\S+\.\S+$/.test(form.email)) errors.email = 'Valid email is required.'
  if (form.specializations.length === 0) errors.specializations = 'Select at least one specialization.'
  if (form.available_days.length === 0) errors.available_days = 'Select at least one day.'
  const n = parseInt(form.max_hearings_per_day)
  if (isNaN(n) || n < 1 || n > 8) errors.max_hearings_per_day = 'Must be between 1 and 8.'
  return errors
}

export default function Judges() {
  const {
    judges,
    loading,
    createJudge,
    updateJudge,
    deleteJudge
  } = useJudges()

  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(emptyForm)
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(null) // { judge, action }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModal(true) }
  const openEdit = (j) => { 
    setEditing(j)
    setForm({ 
      name: j.name, 
      email: j.email || '', 
      phone: j.phone || '', 
      rank: j.rank || 'High Court Judge', 
      gender: j.gender || 'Male', 
      division: j.division || 'Abuja',
      specializations: [...j.specializations], 
      available_days: [...j.available_days], 
      max_hearings_per_day: j.max_hearings_per_day 
    })
    setErrors({})
    setModal(true) 
  }

  const toggleArr = (key, val) => setForm(f => ({
    ...f,
    [key]: f[key].includes(val) ? f[key].filter(x => x !== val) : [...f[key], val]
  }))

  const handleSave = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      if (editing) {
        await updateJudge({ id: editing.id, payload: form })
        toast('Judge updated successfully.')
      } else {
        await createJudge(form)
        toast('Judge added successfully.')
      }
      setModal(false)
    } catch (e) {
      const msg = e.response?.data?.detail || 'An error occurred.'
      toast(msg, 'error')
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (judge) => {
    try {
      if (judge.is_active) {
        await updateJudge({ id: judge.id, payload: { ...judge, is_active: false } })
        toast(`${judge.name} deactivated.`, 'warning')
      } else {
        await updateJudge({ id: judge.id, payload: { ...judge, is_active: true } })
        toast(`${judge.name} reactivated.`, 'success')
      }
    } catch { toast('Failed to update judge.', 'error') }
  }

  const isDirty = editing
    ? JSON.stringify(form) !== JSON.stringify({ 
        name: editing.name, 
        email: editing.email || '', 
        phone: editing.phone || '', 
        rank: editing.rank || 'High Court Judge', 
        gender: editing.gender || 'Male', 
        division: editing.division || 'Abuja',
        specializations: [...editing.specializations], 
        available_days: [...editing.available_days], 
        max_hearings_per_day: editing.max_hearings_per_day 
      })
    : JSON.stringify(form) !== JSON.stringify(emptyForm)

  return (
    <div className="page-content">
      <PageSEO title="Judges" description="Browse and assign court judges." />
      <div className="page-header">
        <div>
          <h1>Judges</h1>
          <p className="page-header-sub">Manage judicial officers and their availability</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Add Judge
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Judge</th>
                <th>Division / Rank</th>
                <th>Specializations</th>
                <th>Available Days</th>
                <th>Max/Day</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array(4).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: '1rem', margin: '0.25rem 0' }} /></td></tr>
              )) : judges.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="table-empty"><div className="table-empty-icon">⚖️</div><p>No judges yet. Add one to get started.</p></div>
                </td></tr>
              ) : judges.map(j => (
                <tr key={j.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{j.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{j.email}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{j.division}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{j.rank}</div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                      {j.specializations.map(s => <Badge key={s} value={s} />)}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {j.available_days.map(d => d.slice(0,3).toUpperCase()).join(', ')}
                  </td>
                  <td style={{ textAlign: 'center' }}>{j.max_hearings_per_day}</td>
                  <td><Badge value={j.is_active ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(j)}>Edit</button>
                      <button
                        className="btn btn-sm"
                        style={j.is_active
                          ? { background: '#fdf2f2', color: 'var(--criminal)', border: '1px solid #e8c0bd' }
                          : { background: '#eafaf1', color: 'var(--family)', border: '1px solid #a9dfbf' }}
                        onClick={() => setConfirm({ judge: j, action: j.is_active ? 'deactivate' : 'activate' })}
                      >
                        {j.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Judge' : 'Add Judge'} dirty={isDirty} width="600px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className={`form-input${errors.name ? ' error' : ''}`} placeholder="Hon. Justice Firstname Surname"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              {errors.name && <span className="form-error">{errors.name}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Rank</label>
              <select className="form-select" value={form.rank} onChange={e => setForm(f => ({ ...f, rank: e.target.value }))}>
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input className={`form-input${errors.email ? ' error' : ''}`} type="email" placeholder="judge@court.gov.ng"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              {errors.email && <span className="form-error">{errors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input className="form-input" placeholder="+234 ..."
                value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Division</label>
              <select className="form-select" value={form.division} onChange={e => setForm(f => ({ ...f, division: e.target.value }))}>
                {DIVISIONS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gender</label>
              <select className="form-select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Specializations *</label>
            <div className="checkbox-group">
              {SPECIALIZATIONS.map(s => (
                <label key={s} className="checkbox-pill">
                  <input type="checkbox" checked={form.specializations.includes(s)} onChange={() => toggleArr('specializations', s)} />
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </label>
              ))}
            </div>
            {errors.specializations && <span className="form-error">{errors.specializations}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Available Days *</label>
            <div className="checkbox-group">
              {DAYS.map(d => (
                <label key={d} className="checkbox-pill">
                  <input type="checkbox" checked={form.available_days.includes(d)} onChange={() => toggleArr('available_days', d)} />
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </label>
              ))}
            </div>
            {errors.available_days && <span className="form-error">{errors.available_days}</span>}
          </div>

          <div className="form-group">
            <label className="form-label">Max Hearings Per Day *</label>
            <input className={`form-input${errors.max_hearings_per_day ? ' error' : ''}`} type="number" min={1} max={8}
              value={form.max_hearings_per_day} onChange={e => setForm(f => ({ ...f, max_hearings_per_day: e.target.value }))} style={{ maxWidth: '120px' }} />
            <span className="form-help">Daily capacity limit (1–8 hearings)</span>
            {errors.max_hearings_per_day && <span className="form-error">{errors.max_hearings_per_day}</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner spinner-white" /> Saving...</> : editing ? 'Save Changes' : 'Add Judge'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm deactivate/activate */}
      {confirm && (
        <ConfirmDialog
          isOpen={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => handleToggleActive(confirm.judge)}
          title={confirm.action === 'deactivate' ? 'Deactivate Judge' : 'Activate Judge'}
          message={confirm.action === 'deactivate'
            ? `Deactivate ${confirm.judge.name}? They will not be scheduled for new hearings.`
            : `Reactivate ${confirm.judge.name}? They will be available for scheduling again.`}
          confirmLabel={confirm.action === 'deactivate' ? 'Deactivate' : 'Activate'}
          danger={confirm.action === 'deactivate'}
        />
      )}
    </div>
  )
}
