import { useQuery, useMutation } from './useQuery.js'
import client from '../api/client.js'

export function useJudges(options = {}) {
  const query = useQuery('/judges', options)

  const createMutation = useMutation(
    (payload) => client.post('/judges', payload),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const updateMutation = useMutation(
    ({ id, payload }) => client.put(`/judges/${id}`, payload),
    {
      onSuccess: () => query.invalidate()
    }
  )

  const deleteMutation = useMutation(
    (id) => client.delete(`/judges/${id}`),
    {
      onSuccess: () => query.invalidate()
    }
  )

  return {
    judges: query.data || [],
    loading: query.loading,
    error: query.error,
    invalidate: query.invalidate,
    mutate: query.mutate,
    createJudge: createMutation.execute,
    isCreating: createMutation.loading,
    updateJudge: updateMutation.execute,
    isUpdating: updateMutation.loading,
    deleteJudge: deleteMutation.execute,
    isDeleting: deleteMutation.loading
  }
}
