import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import client from '../api/client.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge, PriorityDot } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'

const CASE_TYPES = ['criminal','civil','family','commercial','land','constitutional']
const STATUSES   = ['pending','scheduled','heard','adjourned']
const emptyForm  = { case_number: '', title: '', case_type: '', num_parties: '', priority: 'normal', assigned_judge_id: '', notes: '' }

function validate(form) {
  const errors = {}
  if (!form.case_number || form.case_number.trim().length < 5) errors.case_number = 'Minimum 5 characters.'
  if (!form.title || form.title.trim().length < 3) errors.title = 'Minimum 3 characters.'
  if (!form.case_type) errors.case_type = 'Please select a case type.'
  const np = parseInt(form.num_parties)
  if (isNaN(np) || np < 2 || np > 20) errors.num_parties = 'Must be between 2 and 20.'
  if (!form.assigned_judge_id) errors.assigned_judge_id = 'Please assign a judge.'
  if (form.notes && form.notes.length > 500) errors.notes = 'Maximum 500 characters.'
  return errors
}

export default function Cases() {
  const [cases, setCases]       = useState([])
  const [judges, setJudges]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [confirm, setConfirm]   = useState(null)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [prediction, setPrediction]     = useState(null)
  const [predLoading, setPredLoading]   = useState(false)
  const predTimer = useRef(null)
  const [searchParams] = useSearchParams()

  useEffect(() => {
    const s = searchParams.get('status')
    if (s) setFilterStatus(s)
    loadAll()
  }, [])

  const loadAll = () => {
    setLoading(true)
    Promise.all([client.get('/cases'), client.get('/judges')]).then(([c, j]) => {
      setCases(c.data); setJudges(j.data.filter(j => j.is_active))
    }).catch(() => {}).finally(() => setLoading(false))
  }

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setPrediction(null); setModal(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ case_number: c.case_number, title: c.title, case_type: c.case_type, num_parties: c.num_parties, priority: c.priority, assigned_judge_id: c.assigned_judge_id || '', notes: c.notes || '' })
    setErrors({}); setPrediction(null); setModal(true)
  }

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const triggerPrediction = useCallback((formSnapshot) => {
    const { case_type, num_parties, priority, assigned_judge_id } = formSnapshot
    if (!case_type || !num_parties || !priority || !assigned_judge_id) { setPrediction(null); return }
    const np = parseInt(num_parties)
    if (isNaN(np) || np < 2 || np > 20) return
    clearTimeout(predTimer.current)
    predTimer.current = setTimeout(async () => {
      setPredLoading(true)
      try {
        const r = await client.post('/ml/predict', { case_type, num_parties: np, priority, judge_id: parseInt(assigned_judge_id) })
        setPrediction(r.data)
      } catch { setPrediction(null) }
      finally { setPredLoading(false) }
    }, 300)
  }, [])

  useEffect(() => { triggerPrediction(form) }, [form.case_type, form.num_parties, form.priority, form.assigned_judge_id])

  const handleSave = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { ...form, num_parties: parseInt(form.num_parties), assigned_judge_id: parseInt(form.assigned_judge_id) }
      if (editing) {
        await client.put(`/cases/${editing.id}`, payload)
        toast('Case updated successfully.')
      } else {
        await client.post('/cases', payload)
        toast('Case registered successfully.')
      }
      setModal(false); loadAll()
    } catch (e) {
      toast(e.response?.data?.detail || 'An error occurred.', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (c) => {
    try {
      await client.delete(`/cases/${c.id}`)
      toast('Case deleted.', 'warning'); loadAll()
    } catch { toast('Failed to delete case.', 'error') }
  }

  const filtered = cases.filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.case_number.toLowerCase().includes(q) || c.title.toLowerCase().includes(q)
    const matchStatus = !filterStatus || c.status === filterStatus
    const matchType   = !filterType   || c.case_type === filterType
    return matchSearch && matchStatus && matchType
  }).sort((a, b) => {
    const prio = { urgent: 0, normal: 1, low: 2 }
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority]
    return new Date(a.created_at) - new Date(b.created_at)
  })

  const isDirty = editing
    ? JSON.stringify(form) !== JSON.stringify({ case_number: editing.case_number, title: editing.title, case_type: editing.case_type, num_parties: editing.num_parties, priority: editing.priority, assigned_judge_id: editing.assigned_judge_id || '', notes: editing.notes || '' })
    : JSON.stringify(form) !== JSON.stringify(emptyForm)

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Cases</h1>
          <p className="page-header-sub">{cases.length} cases registered · {cases.filter(c => c.status === 'pending').length} pending</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Register Case
        </button>
      </div>

      <div className="card">
        {/* Filters */}
        <div className="filters-bar">
          <input className="form-input filters-search" placeholder="Search by case number or title…" value={search} onChange={e => setSearch(e.target.value)} />
          <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
          </select>
          <select className="form-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {CASE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
          </select>
          {(search || filterStatus || filterType) && (
            <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterType('') }}>Clear</button>
          )}
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Case Number</th>
                <th>Title</th>
                <th>Type</th>
                <th>Priority</th>
                <th>Assigned Judge</th>
                <th>Status</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array(5).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={8}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="table-empty"><div className="table-empty-icon">⚖️</div><p>No cases found.</p></div>
                </td></tr>
              ) : filtered.map(c => (
                <tr key={c.id}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)' }}>{c.case_number}</span></td>
                  <td style={{ maxWidth: '220px' }}>
                    <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={c.title}>{c.title}</span>
                  </td>
                  <td><Badge value={c.case_type} /></td>
                  <td><PriorityDot priority={c.priority} /></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.assigned_judge_name || '—'}</td>
                  <td><Badge value={c.status} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn btn-secondary btn-sm"
                        disabled={c.status === 'scheduled' || c.status === 'heard'}
                        title={c.status === 'scheduled' || c.status === 'heard' ? 'Case already scheduled' : ''}
                        onClick={() => openEdit(c)}
                      >Edit</button>
                      {c.status === 'pending' && (
                        <button className="btn btn-sm" style={{ background: '#fdf2f2', color: 'var(--criminal)', border: '1px solid #e8c0bd' }}
                          onClick={() => setConfirm(c)}>Delete</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register/Edit Modal */}
      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Case' : 'Register Case'} width="640px" dirty={isDirty}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Case Number *</label>
              <input className={`form-input${errors.case_number ? ' error' : ''}`} placeholder="FHC/ABJ/CR/001/2024"
                value={form.case_number} onChange={e => setField('case_number', e.target.value)} />
              {errors.case_number && <span className="form-error">{errors.case_number}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Case Type *</label>
              <select className={`form-select${errors.case_type ? ' error' : ''}`} value={form.case_type} onChange={e => setField('case_type', e.target.value)}>
                <option value="">Select type…</option>
                {CASE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
              {errors.case_type && <span className="form-error">{errors.case_type}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Case Title *</label>
            <input className={`form-input${errors.title ? ' error' : ''}`} placeholder="e.g. FRN v. Adeyemi"
              value={form.title} onChange={e => setField('title', e.target.value)} />
            {errors.title && <span className="form-error">{errors.title}</span>}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Number of Parties *</label>
              <input className={`form-input${errors.num_parties ? ' error' : ''}`} type="number" min={2} max={20} placeholder="e.g. 3"
                value={form.num_parties} onChange={e => setField('num_parties', e.target.value)} />
              <span className="form-help">Total parties (plaintiff + defendant + others)</span>
              {errors.num_parties && <span className="form-error">{errors.num_parties}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Judge *</label>
              <select className={`form-select${errors.assigned_judge_id ? ' error' : ''}`} value={form.assigned_judge_id} onChange={e => setField('assigned_judge_id', e.target.value)}>
                <option value="">Select judge…</option>
                {judges.map(j => <option key={j.id} value={j.id}>{j.name} ({j.specializations.join(', ')})</option>)}
              </select>
              {errors.assigned_judge_id && <span className="form-error">{errors.assigned_judge_id}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Priority *</label>
            <div className="radio-group">
              {['urgent','normal','low'].map(p => (
                <label key={p} className={`radio-pill radio-${p}`}>
                  <input type="radio" name="priority" value={p} checked={form.priority === p} onChange={() => setField('priority', p)} />
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </label>
              ))}
            </div>
          </div>

          {/* Live prediction */}
          {(predLoading || prediction) && (
            <div className="info-box info-box-blue animate-in">
              {predLoading
                ? <><span className="spinner" style={{ width: 14, height: 14 }} /> <span>Calculating estimated duration…</span></>
                : <><span style={{ fontWeight: 700 }}>ℹ</span> <span>Estimated hearing duration: <strong>{prediction.predicted_duration_display}</strong></span></>
              }
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Notes <span style={{ fontWeight: 400, textTransform: 'none' }}>(optional)</span></label>
            <textarea className={`form-textarea${errors.notes ? ' error' : ''}`} placeholder="Any relevant context for scheduling…"
              value={form.notes} onChange={e => setField('notes', e.target.value)} rows={3} />
            <span className="form-help" style={{ textAlign: 'right' }}>{(form.notes||'').length}/500</span>
            {errors.notes && <span className="form-error">{errors.notes}</span>}
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner spinner-white" /> Saving...</> : editing ? 'Save Changes' : 'Register Case'}
            </button>
          </div>
        </div>
      </Modal>

      {confirm && (
        <ConfirmDialog
          isOpen={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => handleDelete(confirm)}
          title="Delete Case"
          message={`Delete ${confirm.case_number}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
        />
      )}
    </div>
  )
}
