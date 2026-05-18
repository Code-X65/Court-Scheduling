/**
 * Centralised endpoint constants.
 * Use these instead of string literals so refactors stay in sync.
 */
export const API = {
  // Auth
  LOGIN:     '/login',

  // Dashboard
  DASHBOARD_STATS: '/dashboard/stats',

  // Cases
  CASES:       '/cases',
  CASE_BY_ID:  (id) => `/cases/${id}`,
  CASE_STATUS: (id) => `/cases/${id}/status`,
  CASE_PATCH:  (id) => `/cases/${id}`,

  // Judges
  JUDGES:      '/judges',
  JUDGE_BY_ID: (id) => `/judges/${id}`,

  // Courtrooms
  COURTROOMS:      '/courtrooms',
  COURTROOM_BY_ID: (id) => `/courtrooms/${id}`,

  // Users
  USERS:          '/users',
  USER_BY_ID:     (id) => `/users/${id}`,
  USER_RESET_PWD: (id) => `/users/${id}/reset-password`,

  // Schedules
  SCHEDULES:          '/schedules',
  SCHEDULES_GENERATE: '/schedules/generate',
  SCHEDULE_BY_ID:     (id) => `/schedules/${id}`,
  SCHEDULE_PUBLISH:   (id) => `/schedules/${id}/publish`,

  // Hearings
  HEARINGS:         '/hearings',
  HEARING_BY_ID:    (id) => `/hearings/${id}`,
  HEARING_STATUS:   (id) => `/hearings/${id}/status`,

  // Analytics / Reports
  ANALYTICS_REPORTS:      '/analytics/reports',
  GAP_ANALYSIS:           '/analytics/gap-analysis',
  ANALYTICS_EMAIL_STAKEHOLDERS: '/analytics/email-stakeholders',
  SETTINGS_HOLIDAYS:      '/settings/holidays',
  SETTINGS_GENERAL:       '/settings/general',
  AUDIT_LOGS:             '/audit/logs',
  MAINTENANCE_BACKUP:     '/maintenance/backup',

  // AI
  AI_STATS:    '/ai/stats',
  AI_TRAIN:    '/ai/train',
  AI_PREDICT:  '/ai/predict',
  AI_SUGGEST:  '/ai/suggest',
}
