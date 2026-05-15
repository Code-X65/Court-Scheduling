import { useState, useEffect } from 'react'
import client from '../api/client.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'

const emptyForm = { name: '', capacity: '' }

function validate(form) {
  const errors = {}
  if (!form.name || form.name.trim().length < 1) errors.name = 'Courtroom name is required.'
  if (form.name && form.name.trim().length > 50) errors.name = 'Max 50 characters.'
  const n = parseInt(form.capacity)
  if (isNaN(n) || n < 1 || n > 500) errors.capacity = 'Capacity must be between 1 and 500.'
  return errors
}

export default function Courtrooms() {
  const [rooms, setRooms]     = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(emptyForm)
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(null)

  const load = () => {
    setLoading(true)
    client.get('/courtrooms').then(r => setRooms(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModal(true) }
  const openEdit = (r) => { setEditing(r); setForm({ name: r.name, capacity: r.capacity }); setErrors({}); setModal(true) }

  const handleSave = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { ...form, capacity: parseInt(form.capacity) }
      if (editing) {
        await client.put(`/courtrooms/${editing.id}`, payload)
        toast('Courtroom updated successfully.')
      } else {
        await client.post('/courtrooms', payload)
        toast('Courtroom added successfully.')
      }
      setModal(false); load()
    } catch (e) {
      toast(e.response?.data?.detail || 'An error occurred.', 'error')
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (room) => {
    try {
      if (room.is_active) {
        await client.delete(`/courtrooms/${room.id}`)
        toast(`${room.name} deactivated.`, 'warning')
      } else {
        await client.put(`/courtrooms/${room.id}`, { ...room, is_active: true })
        toast(`${room.name} reactivated.`, 'success')
      }
      load()
    } catch { toast('Failed to update courtroom.', 'error') }
  }

  const isDirty = editing
    ? form.name !== editing.name || parseInt(form.capacity) !== editing.capacity
    : form.name !== '' || form.capacity !== ''

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Courtrooms</h1>
          <p className="page-header-sub">Manage courtroom availability and capacity</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
          Add Courtroom
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Courtroom</th>
                <th>Capacity</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array(3).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={4}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
              )) : rooms.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="table-empty"><div className="table-empty-icon">🏛</div><p>No courtrooms yet. Add one to get started.</p></div>
                </td></tr>
              ) : rooms.map(r => (
                <tr key={r.id}>
                  <td style={{ fontWeight: 600 }}>{r.name}</td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{r.capacity}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>seats</span>
                    </span>
                  </td>
                  <td><Badge value={r.is_active ? 'Active' : 'Inactive'} /></td>
                  <td>
                    <div className="table-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(r)}>Edit</button>
                      <button
                        className="btn btn-sm"
                        style={r.is_active
                          ? { background: '#fdf2f2', color: 'var(--criminal)', border: '1px solid #e8c0bd' }
                          : { background: '#eafaf1', color: 'var(--family)', border: '1px solid #a9dfbf' }}
                        onClick={() => setConfirm({ room: r, action: r.is_active ? 'deactivate' : 'activate' })}
                      >
                        {r.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Courtroom' : 'Add Courtroom'} width="440px" dirty={isDirty}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Courtroom Name *</label>
            <input className={`form-input${errors.name ? ' error' : ''}`} placeholder="e.g. Court 1 or Court 3A"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>
          <div className="form-group">
            <label className="form-label">Seating Capacity *</label>
            <input className={`form-input${errors.capacity ? ' error' : ''}`} type="number" min={1} max={500} placeholder="e.g. 60"
              value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} style={{ maxWidth: '160px' }} />
            <span className="form-help">Maximum number of people the room fits (1–500)</span>
            {errors.capacity && <span className="form-error">{errors.capacity}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-secondary" onClick={() => setModal(false)}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? <><span className="spinner spinner-white" /> Saving...</> : editing ? 'Save Changes' : 'Add Courtroom'}
            </button>
          </div>
        </div>
      </Modal>

      {confirm && (
        <ConfirmDialog
          isOpen={!!confirm}
          onClose={() => setConfirm(null)}
          onConfirm={() => handleToggleActive(confirm.room)}
          title={confirm.action === 'deactivate' ? 'Deactivate Courtroom' : 'Activate Courtroom'}
          message={confirm.action === 'deactivate'
            ? `Deactivate ${confirm.room.name}? It will not be used for scheduling.`
            : `Reactivate ${confirm.room.name}? It will be available for scheduling again.`}
          confirmLabel={confirm.action === 'deactivate' ? 'Deactivate' : 'Activate'}
          danger={confirm.action === 'deactivate'}
        />
      )}
    </div>
  )
}
