import { useState } from 'react'
import client from '../api/client.js'
import { toast } from '../components/Toast.jsx'
import Modal from '../components/Modal.jsx'
import { Badge } from '../components/StatusBadge.jsx'
import { useQuery, useMutation } from '../hooks/useQuery.js'

export default function Users() {
  const { data: users, loading, invalidate, mutate } = useQuery('/users')
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ username: '', fullName: '', role: 'clerk', email: '' })

  const addMutation = useMutation(
    (payload) => client.post('/users', payload),
    {
      onSuccess: () => {
        toast('User created successfully.')
        setShowAdd(false)
        setForm({ username: '', fullName: '', role: 'clerk', email: '' })
        invalidate()
      },
      onError: () => toast('Failed to create user.', 'error')
    }
  )

  const deleteMutation = useMutation(
    (id) => client.delete(`/users/${id}`),
    {
      onMutate: (id) => {
        const prev = [...users]
        mutate(users.filter(u => u.id !== id))
        return { prev }
      },
      onSuccess: () => toast('User deleted.'),
      onError: (err, id, context) => {
        mutate(context.prev)
        toast('Failed to delete user.', 'error')
      }
    }
  )

  const handleAdd = async (e) => {
    e.preventDefault()
    await addMutation.execute(form)
  }

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this user?')) {
      await deleteMutation.execute(id)
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>User Management</h1>
          <p className="page-header-sub">Manage system access and roles</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginRight: '0.5rem' }}>
            <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add User
        </button>
      </div>

      <div className="card">
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last Login</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={5}><div className="skeleton" style={{ height: '2rem' }} /></td></tr>
                ))
              ) : (users || []).length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem' }}>No users found.</td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{u.fullName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{u.username}</div>
                  </td>
                  <td>{u.email}</td>
                  <td><Badge value={u.role} /></td>
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleString('en-GB') : 'Never'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <button className="btn btn-icon" title="Reset Password" onClick={() => toast(`Password reset link sent to ${u.email}`, 'info')}>
                        🔑
                      </button>
                      <button className="btn btn-icon" onClick={() => handleDelete(u.id)} style={{ color: 'var(--criminal)' }}>
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create New User" width="480px">
        <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" required value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" required value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label className="form-label">System Role</label>
            <select className="form-select" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
              <option value="clerk">Clerk (Standard Access)</option>
              <option value="judge">Judge (Case View Only)</option>
              <option value="admin">Administrator (Full Access)</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-secondary" type="button" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={addMutation.loading}>
              {addMutation.loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
