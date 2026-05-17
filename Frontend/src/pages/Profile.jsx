import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from '../components/Toast.jsx'
import client from '../api/client.js'

const isDemo = import.meta.env.VITE_DEMO_MODE === 'true'

export default function Profile() {
  const navigate = useNavigate()
  const username = sessionStorage.getItem('username') || 'Admin'
  const role     = sessionStorage.getItem('role') || 'admin'
  
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' })
  const [profileForm, setProfileForm]   = useState({ fullName: username, email: `${username.toLowerCase()}@court.gov.ng` })
  const [profileLoading, setProfileLoading] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    if (!isDemo) {
      const ac = new AbortController()
      client.get('/users/me', { signal: ac.signal }).then(r => {
        const u = r.data?.data
        if (u) {
          setProfileForm({ fullName: u.fullName || u.username, email: u.email || '' })
        }
      }).catch(() => {})
      return () => ac.abort()
    }
  }, [username])

  const handleProfileUpdate = async (e) => {
    e.preventDefault()
    setProfileLoading(true)
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 800))
      } else {
        await client.patch('/users/me', { fullName: profileForm.fullName, email: profileForm.email })
      }
      toast('Profile updated successfully.', 'success')
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to update profile.', 'error')
    } finally { setProfileLoading(false) }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    if (passwordForm.new !== passwordForm.confirm) {
      toast('Passwords do not match.', 'error')
      return
    }
    setPasswordLoading(true)
    try {
      if (isDemo) {
        await new Promise(r => setTimeout(r, 1500))
      } else {
        await client.post('/users/me/password', { currentPassword: passwordForm.current, newPassword: passwordForm.new })
      }
      toast('Password changed successfully.', 'success')
      setPasswordForm({ current: '', new: '', confirm: '' })
    } catch (e) {
      toast(e.response?.data?.detail || 'Failed to change password.', 'error')
    } finally { setPasswordLoading(false) }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <div>
          <h1>Profile Settings</h1>
          <p className="page-header-sub">Manage your personal information and security</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '2rem' }}>
        
        {/* Profile Info */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Personal Information</h3>
          <form onSubmit={handleProfileUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={profileForm.fullName} onChange={e => setProfileForm({...profileForm, fullName: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input className="form-input" type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} />
            </div>
            <div className="form-group">
              <label className="form-label">System Role</label>
              <input className="form-input" value={role.toUpperCase()} disabled style={{ background: 'var(--navy-light)', fontWeight: 600 }} />
            </div>
            <button className="btn btn-primary" type="submit" disabled={profileLoading} style={{ alignSelf: 'flex-start' }}>
              Update Profile
            </button>
          </form>
        </div>

        {/* Password Reset */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Change Password</h3>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-input" type="password" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input className="form-input" type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input className="form-input" type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} required />
            </div>
            <button className="btn btn-secondary" type="submit" disabled={passwordLoading} style={{ alignSelf: 'flex-start' }}>
              Change Password
            </button>
          </form>
        </div>

      </div>

      {/* Account Activity */}
      <div className="card" style={{ marginTop: '2rem', padding: '1.5rem' }}>
        <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem' }}>Recent Security Activity</h3>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Device / IP</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ fontWeight: 600 }}>Login Successful</td>
                <td>Chrome (Windows) · 192.168.1.1</td>
                <td>Today, 10:15 AM</td>
                <td><span className="badge badge-heard">Success</span></td>
              </tr>
              <tr>
                <td style={{ fontWeight: 600 }}>Password Change</td>
                <td>Safari (iPhone) · 102.89.34.21</td>
                <td>Oct 12, 2023</td>
                <td><span className="badge badge-heard">Success</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
