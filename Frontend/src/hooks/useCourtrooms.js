import { useQuery, useMutation } from './useQuery.js'
import client from '../api/client.js'

export function useCourtrooms(options = {}) {
  const query = useQuery('/courtrooms', options)

  const createMutation = useMutation(
    (payload) => client.post('/courtrooms', payload),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const updateMutation = useMutation(
    ({ id, payload }) => client.put(`/courtrooms/${id}`, payload),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const deleteMutation = useMutation(
    (id) => client.delete(`/courtrooms/${id}`),
    {
      onSuccess: () => query.invalidate()
    }
  )

  return {
    courtrooms: query.data || [],
    loading: query.loading,
    error: query.error,
    invalidate: query.invalidate,
    mutate: query.mutate,
    createCourtroom: createMutation.execute,
    isCreating: createMutation.loading,
    updateCourtroom: updateMutation.execute,
    isUpdating: updateMutation.loading,
    deleteCourtroom: deleteMutation.execute,
    isDeleting: deleteMutation.loading
  }
}
