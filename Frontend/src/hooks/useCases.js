import { useQuery, useMutation } from './useQuery.js'
import client from '../api/client.js'

export function useCases(options = {}) {
  const query = useQuery('/cases', options)
  
  const createMutation = useMutation(
    (payload) => client.post('/cases', payload),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const updateMutation = useMutation(
    ({ id, payload }) => client.put(`/cases/${id}`, payload),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const deleteMutation = useMutation(
    (id) => client.delete(`/cases/${id}`),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const bulkDeleteMutation = useMutation(
    (ids) => Promise.all(ids.map(id => client.delete(`/cases/${id}`))),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const bulkStatusMutation = useMutation(
    ({ ids, status }) => Promise.all(ids.map(id => client.patch(`/cases/${id}`, { status }))),
    {
      onSuccess: () => query.invalidate()
    }
  )

  return {
    cases: query.data || [],
    loading: query.loading,
    error: query.error,
    invalidate: query.invalidate,
    mutate: query.mutate,
    createCase: createMutation.execute,
    isCreating: createMutation.loading,
    updateCase: updateMutation.execute,
    isUpdating: updateMutation.loading,
    deleteCase: deleteMutation.execute,
    isDeleting: deleteMutation.loading,
    bulkDelete: bulkDeleteMutation.execute,
    isBulkDeleting: bulkDeleteMutation.loading,
    bulkStatus: bulkStatusMutation.execute,
    isBulkUpdating: bulkStatusMutation.loading
  }
}
