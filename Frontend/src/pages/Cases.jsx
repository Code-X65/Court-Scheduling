import { useState, useRef, useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import client from '../api/client.js'
import { useQuery, useMutation } from '../hooks/useQuery.js'
import { useCases } from '../hooks/useCases.js'
import { useJudges } from '../hooks/useJudges.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge, PriorityDot } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'
import { useHistory, useKeyboardShortcuts } from '../hooks/useUX.js'

const CASE_TYPES = ['criminal','civil','family','commercial','land','constitutional']
const STATUSES   = ['pending','scheduled','heard','adjourned']
const emptyForm  = { case_number: '', title: '', case_type: '', num_parties: '', priority: 'normal', assigned_judge_id: '', notes: '', status: 'pending' }

export default function Cases() {
  const {
    cases,
    loading,
    invalidate,
    mutate,
    createCase,
    updateCase,
    deleteCase,
    bulkDelete,
    bulkStatus
  } = useCases()

  const { judges } = useJudges()
  
  const [modal, setModal]       = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [errors, setErrors]     = useState({})
  const [saving, setSaving]     = useState(false)
  const [confirm, setConfirm]   = useState(null)
  const [search, setSearch]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterType, setFilterType]     = useState('')
  const [filterPriorities, setFilterPriorities] = useState([])
  const [dateRange, setDateRange]       = useState({ start: '', end: '' })
  const [selectedIds, setSelectedIds] = useState([])
  const toggleSelect = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === filtered.length ? [] : filtered.map(c => c.id))
  const [limit, setLimit]             = useState(20)
  const [prediction, setPrediction]     = useState(null)
  const [predLoading, setPredLoading]   = useState(false)
  const predTimer = useRef(null)

  const { pushAction, undo, redo } = useHistory()
  const [searchParams] = useSearchParams()

  const deleteMutation = useMutation(
    (id) => client.delete(`/cases/${id}`),
    {
      onMutate: (id) => {
        // Optimistic Update
        const previous = [...cases]
        mutate(cases.filter(c => c.id !== id))
        return { previous }
      },
      onSuccess: () => toast('Case deleted. Press Ctrl+Z to undo.', 'warning'),
      onError: (err, id, context) => {
        mutate(context.previous)
        toast('Failed to delete case.', 'error')
      }
    }
  )

  useEffect(() => {
    const s = searchParams.get('status')
    if (s) setFilterStatus(s)
  }, [searchParams])

  useKeyboardShortcuts([
    { ctrl: true, key: 'z', action: undo },
    { ctrl: true, key: 'y', action: redo },
    { key: '/', action: () => document.querySelector('.filters-search')?.focus() }
  ])

  const openAdd = () => { setEditing(null); setForm(emptyForm); setErrors({}); setPrediction(null); setModal(true) }
  const openEdit = (c) => {
    setEditing(c)
    setForm({ case_number: c.case_number, title: c.title, case_type: c.case_type, num_parties: c.num_parties, priority: c.priority, assigned_judge_id: c.assigned_judge_id || '', notes: c.notes || '', status: c.status || 'pending' })
    setErrors({}); setPrediction(null); setModal(true)
  }

  const setField = (key, val) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form, num_parties: parseInt(form.num_parties), assigned_judge_id: parseInt(form.assigned_judge_id), status: form.status }
      if (editing) await updateCase({ id: editing.id, payload })
      else await createCase(payload)
      setModal(false)
      toast('Case saved successfully.')
    } catch (e) {
      toast(e.response?.data?.detail || 'An error occurred.', 'error')
    } finally { setSaving(false) }
  }

  const handleDelete = async (c) => {
    setConfirm(null)
    const oldCase = { ...c }
    await deleteMutation.execute(c.id)
    
    pushAction(
      async () => { await createCase(oldCase) },
      async () => { await deleteCase(oldCase.id) },
      `Delete ${oldCase.case_number}`
    )
  }

  const [favorites, setFavorites] = useState(JSON.parse(localStorage.getItem('fav_cases') || '[]'))
  const [showOnlyFavs, setShowOnlyFavs] = useState(false)

  const toggleFavorite = (id) => {
    const next = favorites.includes(id) ? favorites.filter(x => x !== id) : [...favorites, id]
    setFavorites(next)
    localStorage.setItem('fav_cases', JSON.stringify(next))
  }

  const filtered = (cases || []).filter(c => {
    const q = search.toLowerCase()
    const matchSearch = !q || c.case_number.toLowerCase().includes(q) || c.title.toLowerCase().includes(q) || c.notes?.toLowerCase().includes(q)
    const matchStatus = !filterStatus || c.status === filterStatus
    const matchType   = !filterType   || c.case_type === filterType
    const matchPriority = filterPriorities.length === 0 || filterPriorities.includes(c.priority)
    const matchFav      = !showOnlyFavs || favorites.includes(c.id)
    const regDate = new Date(c.created_at)
    const matchStart = !dateRange.start || regDate >= new Date(dateRange.start)
    const matchEnd   = !dateRange.end   || regDate <= new Date(dateRange.end)
    return matchSearch && matchStatus && matchType && matchPriority && matchStart && matchEnd && matchFav
  }).sort((a, b) => {
    const prio = { urgent: 0, normal: 1, low: 2 }
    if (prio[a.priority] !== prio[b.priority]) return prio[a.priority] - prio[b.priority]
    return new Date(b.created_at) - new Date(a.created_at)
  })

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} cases?`)) return
    setSaving(true)
    try {
      await bulkDelete(selectedIds)
      toast(`Successfully deleted ${selectedIds.length} cases.`, 'warning')
      setSelectedIds([])
    } catch {
      toast('Failed to delete some cases.', 'error')
    } finally { setSaving(false) }
  }

  const handleBulkStatus = async (newStatus) => {
    setSaving(true)
    try {
      await bulkStatus({ ids: selectedIds, status: newStatus })
      toast(`Updated ${selectedIds.length} cases to ${newStatus}.`, 'success')
      setSelectedIds([])
    } catch {
      toast('Failed to update some cases.', 'error')
    } finally { setSaving(false) }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Cases</h1>
          <p className="page-header-sub">{(cases || []).length} cases registered · {(cases || []).filter(c => c.status === 'pending').length} pending</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className={`btn ${showOnlyFavs ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowOnlyFavs(!showOnlyFavs)}>
            {showOnlyFavs ? '⭐ Favorites Only' : '☆ All Cases'}
          </button>
          <button className="btn btn-primary" onClick={openAdd}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            Register Case
          </button>
        </div>
      </div>

      <div className="card">
        <div className="filters-bar" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', width: '100%' }}>
            <input className="form-input filters-search" style={{ flex: 1 }} placeholder="Fuzzy search case number, title, or notes…" value={search} onChange={e => setSearch(e.target.value)} />
            <select className="form-select" style={{ width: '180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
            <select className="form-select" style={{ width: '180px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">All Types</option>
              {CASE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Registration Range:</span>
              <input type="date" className="form-input" style={{ width: '140px', padding: '0.35rem' }} value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} />
              <span style={{ fontSize: '0.8rem' }}>to</span>
              <input type="date" className="form-input" style={{ width: '140px', padding: '0.35rem' }} value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Priorities:</span>
              {['urgent','normal','low'].map(p => (
                <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                  <input type="checkbox" checked={filterPriorities.includes(p)} onChange={e => {
                    if (e.target.checked) setFilterPriorities([...filterPriorities, p])
                    else setFilterPriorities(filterPriorities.filter(x => x !== p))
                  }} />
                  {p.charAt(0).toUpperCase()+p.slice(1)}
                </label>
              ))}
            </div>
            {(search || filterStatus || filterType || filterPriorities.length > 0 || dateRange.start || dateRange.end) && (
              <button className="btn btn-secondary btn-sm" onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterPriorities([]); setDateRange({start:'', end:''}) }}>Clear All</button>
            )}
          </div>
        </div>

        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}><input type="checkbox" checked={filtered.length > 0 && selectedIds.length === filtered.length} onChange={toggleSelectAll} /></th>
                <th style={{ width: '40px', textAlign: 'center' }}>Fav</th>
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
                <tr key={i}><td colSpan={12}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
              )) : filtered.length === 0 ? (
                <tr><td colSpan={12}><div className="table-empty"><div className="table-empty-icon">⚖️</div><p>No cases found.</p></div></td></tr>
              ) : filtered.slice(0, limit).map(c => (
                <tr key={c.id} style={{ background: selectedIds.includes(c.id) ? 'var(--bg-accent)' : 'transparent' }}>
                  <td><input type="checkbox" checked={selectedIds.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      onClick={() => toggleFavorite(c.id)} 
                      style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: favorites.includes(c.id) ? 'var(--amber)' : 'var(--text-muted)' }}
                      title={favorites.includes(c.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      {favorites.includes(c.id) ? '★' : '☆'}
                    </button>
                  </td>
                  <td><span style={{ fontFamily: 'monospace', fontSize: '0.82rem', fontWeight: 600, color: 'var(--navy)' }}>{c.case_number}</span></td>
                  <td style={{ maxWidth: '220px' }}><span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }} title={c.title}>{c.title}</span></td>
                  <td><Badge value={c.case_type} /></td>
                  <td><PriorityDot priority={c.priority} /></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>{c.assigned_judge_name || '—'}</td>
                  <td><Badge value={c.status} /></td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleDateString('en-GB')}</td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" disabled={c.status === 'scheduled' || c.status === 'heard'} onClick={() => openEdit(c)}>Edit</button>
                      {c.status === 'pending' && <button className="btn btn-sm" style={{ background: 'var(--criminal-pale)', color: 'var(--criminal)', border: '1px solid var(--criminal-border)' }} onClick={() => setConfirm(c)}>Delete</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > limit && (
          <div style={{ padding: '1rem', textAlign: 'center', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary" onClick={() => setLimit(l => l + 20)}>
              Load More ({filtered.length - limit} remaining)
            </button>
          </div>
        )}
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Case' : 'Register Case'} width="640px">
         <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Case Number *</label>
              <input className={`form-input${errors.case_number ? ' error' : ''}`} placeholder="FHC/ABJ/CR/001/2024"
                value={form.case_number} onChange={e => setField('case_number', e.target.value)} />
              <span className="form-help">Format: FHC/[Division]/[Type]/[ID]/[Year]</span>
            </div>
            <div className="form-group">
              <label className="form-label">Case Type *</label>
              <select className={`form-select${errors.case_type ? ' error' : ''}`} value={form.case_type} onChange={e => setField('case_type', e.target.value)}>
                <option value="">Select type…</option>
                {CASE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Status *</label>
            <select className="form-select" value={form.status} onChange={e => setField('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Case Title *</label>
            <input className={`form-input${errors.title ? ' error' : ''}`} placeholder="e.g. FRN v. Adeyemi"
              value={form.title} onChange={e => setField('title', e.target.value)} />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setField('priority', e.target.value)}>
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assigned Judge *</label>
              <select className="form-select" value={form.assigned_judge_id} onChange={e => setField('assigned_judge_id', e.target.value)}>
                <option value="">Select judge…</option>
                {(judges || []).map(j => <option key={j.id} value={j.id}>{j.name}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner spinner-white" /> Saving...</> : 'Save Case'}
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

      {selectedIds.length > 0 && (
        <div className="animate-in" style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--navy)', color: '#fff', padding: '0.8rem 1.8rem',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 1000,
          minWidth: '600px'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedIds.length} Cases Selected</div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => handleBulkStatus('adjourned')}>
              Bulk Adjourn
            </button>
            <button className="btn btn-sm" style={{ background: 'var(--criminal)', color: '#fff', border: 'none' }} onClick={handleBulkDelete}>
              Bulk Delete
            </button>
          </div>

          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)' }} onClick={() => setSelectedIds([])}>Deselect All</button>
          <button className="btn btn-icon" style={{ color: '#fff' }} onClick={() => setSelectedIds([])}>✕</button>
        </div>
      )}
    </div>
  )
}
