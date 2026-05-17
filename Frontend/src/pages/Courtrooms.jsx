import { useState } from 'react'
import { useCourtrooms } from '../hooks/useCourtrooms.js'
import Modal from '../components/Modal.jsx'
import ConfirmDialog from '../components/ConfirmDialog.jsx'
import { Badge } from '../components/StatusBadge.jsx'
import { toast } from '../components/Toast.jsx'

const EQUIPMENT_OPTIONS = ['Video Conferencing', 'Digital Recording', 'Climate Control', 'Wheelchair Accessible', 'Projector']

const emptyForm = { name: '', capacity: '', location: '', equipment: [] }

function validate(form) {
  const errors = {}
  if (!form.name || form.name.trim().length < 1) errors.name = 'Courtroom name is required.'
  if (!form.location || form.location.trim().length < 2) errors.location = 'Location is required.'
  const n = parseInt(form.capacity)
  if (isNaN(n) || n < 1 || n > 500) errors.capacity = 'Capacity must be between 1 and 500.'
  return errors
}

export default function Courtrooms() {
  const {
    courtrooms: rooms,
    loading,
    createCourtroom,
    updateCourtroom,
    deleteCourtroom
  } = useCourtrooms()

  const [modal, setModal]     = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(emptyForm)
  const [errors, setErrors]   = useState({})
  const [saving, setSaving]   = useState(false)
  const [confirm, setConfirm] = useState(null)

  const openAdd  = () => { setEditing(null); setForm(emptyForm); setErrors({}); setModal(true) }
  const openEdit = (r) => { 
    setEditing(r)
    setForm({ 
      name: r.name, 
      capacity: r.capacity, 
      location: r.location || '', 
      equipment: r.equipment || [] 
    })
    setErrors({})
    setModal(true) 
  }

  const toggleEquipment = (eq) => setForm(f => ({
    ...f,
    equipment: f.equipment.includes(eq) ? f.equipment.filter(x => x !== eq) : [...f.equipment, eq]
  }))

  const handleSave = async () => {
    const errs = validate(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const payload = { ...form, capacity: parseInt(form.capacity) }
      if (editing) {
        await updateCourtroom({ id: editing.id, payload })
        toast('Courtroom updated successfully.')
      } else {
        await createCourtroom(payload)
        toast('Courtroom added successfully.')
      }
      setModal(false)
    } catch (e) {
      toast(e.response?.data?.detail || 'An error occurred.', 'error')
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (room) => {
    try {
      if (room.is_active) {
        await deleteCourtroom(room.id)
        toast(`${room.name} deactivated.`, 'warning')
      } else {
        await updateCourtroom({ id: room.id, payload: { ...room, is_active: true } })
        toast(`${room.name} reactivated.`, 'success')
      }
    } catch { toast('Failed to update courtroom.', 'error') }
  }

  const [selectedIds, setSelectedIds] = useState([])

  const toggleSelect = (id) => setSelectedIds(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id])
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === rooms.length ? [] : rooms.map(r => r.id))

  const handleBulkStatus = async (active) => {
    setSaving(true)
    try {
      await Promise.all(selectedIds.map(id => {
        const room = rooms.find(r => r.id === id)
        return updateCourtroom({ id, payload: { ...room, is_active: active } })
      }))
      toast(`Updated ${selectedIds.length} courtrooms.`, 'success')
      setSelectedIds([])
    } catch {
      toast('Failed to update some courtrooms.', 'error')
    } finally { setSaving(false) }
  }

  const isDirty = editing
    ? form.name !== editing.name || parseInt(form.capacity) !== editing.capacity || form.location !== (editing.location || '') || JSON.stringify(form.equipment) !== JSON.stringify(editing.equipment || [])
    : JSON.stringify(form) !== JSON.stringify(emptyForm)

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
                <th style={{ width: '40px' }}><input type="checkbox" checked={rooms.length > 0 && selectedIds.length === rooms.length} onChange={toggleSelectAll} /></th>
                <th>Courtroom</th>
                <th>Location</th>
                <th>Capacity</th>
                <th>Equipment</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? Array(3).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={7}><div className="skeleton" style={{ height: '1rem' }} /></td></tr>
              )) : rooms.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="table-empty"><div className="table-empty-icon">🏛</div><p>No courtrooms yet. Add one to get started.</p></div>
                </td></tr>
              ) : rooms.map(r => (
                <tr key={r.id} style={{ background: selectedIds.includes(r.id) ? 'var(--bg-accent)' : 'transparent' }}>
                  <td><input type="checkbox" checked={selectedIds.includes(r.id)} onChange={() => toggleSelect(r.id)} /></td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{r.location || 'Not set'}</div>
                  </td>
                  <td>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--navy)' }}>{r.capacity}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>seats</span>
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {r.equipment?.map(eq => <Badge key={eq} value={eq} />)}
                    </div>
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

      <Modal isOpen={modal} onClose={() => setModal(false)} title={editing ? 'Edit Courtroom' : 'Add Courtroom'} width="500px" dirty={isDirty}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-group">
            <label className="form-label">Courtroom Name *</label>
            <input className={`form-input${errors.name ? ' error' : ''}`} placeholder="e.g. Court 1 or Court 3A"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            {errors.name && <span className="form-error">{errors.name}</span>}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Location / Floor *</label>
              <input className={`form-input${errors.location ? ' error' : ''}`} placeholder="e.g. Wing A, Ground Floor"
                value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
              {errors.location && <span className="form-error">{errors.location}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Seating Capacity *</label>
              <input className={`form-input${errors.capacity ? ' error' : ''}`} type="number" min={1} max={500} placeholder="e.g. 60"
                value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              {errors.capacity && <span className="form-error">{errors.capacity}</span>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Available Equipment</label>
            <div className="checkbox-group">
              {EQUIPMENT_OPTIONS.map(eq => (
                <label key={eq} className="checkbox-pill">
                  <input type="checkbox" checked={form.equipment.includes(eq)} onChange={() => toggleEquipment(eq)} />
                  {eq}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
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

      {selectedIds.length > 0 && (
        <div className="animate-in" style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--navy)', color: '#fff', padding: '0.8rem 1.8rem',
          borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)',
          display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 1000,
          minWidth: '500px'
        }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{selectedIds.length} Courtrooms Selected</div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.2)' }} />
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="btn btn-sm" style={{ background: 'var(--family)', color: '#fff', border: 'none' }} onClick={() => handleBulkStatus(true)}>Bulk Activate</button>
            <button className="btn btn-sm" style={{ background: 'var(--criminal)', color: '#fff', border: 'none' }} onClick={() => handleBulkStatus(false)}>Bulk Deactivate</button>
          </div>
          <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)' }} onClick={() => setSelectedIds([])}>Deselect All</button>
        </div>
      )}
    </div>
  )
}
