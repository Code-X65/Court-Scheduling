import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useQuery } from '../hooks/useQuery.js'
import client from '../api/client.js'

vi.mock('../api/client.js')

describe('useQuery', () => {
  it('should fetch data and return it', async () => {
    const mockData = [{ id: 1, name: 'Test' }]
    client.get.mockResolvedValue({ data: mockData })

    const { result } = renderHook(() => useQuery('/test'))

    expect(result.current.loading).toBe(true)
    
    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
  })

  it('should handle errors', async () => {
    client.get.mockRejectedValue(new Error('Fetch failed'))

    const { result } = renderHook(() => useQuery('/fail'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBeDefined()
  })
})
