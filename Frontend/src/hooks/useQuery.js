import { useState, useEffect, useCallback, useRef } from 'react'
import client from '../api/client.js'

const cache = new Map()

function getCacheKey(url, params) {
  if (!params) return url
  try {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((acc, key) => {
        if (params[key] !== undefined && params[key] !== null) {
          acc[key] = params[key]
        }
        return acc
      }, {})
    const query = new URLSearchParams(sortedParams).toString()
    return query ? `${url}?${query}` : url
  } catch {
    return url
  }
}

export function useQuery(url, options = {}) {
  const { params, enabled = true, skipCache = false, refetchInterval } = options
  const serializedParams = params ? JSON.stringify(params) : ''
  const cacheKey = getCacheKey(url, params)
  
  const [data, setData] = useState(() => {
    if (skipCache) return null
    return cache.get(cacheKey) || null
  })
  
  const [loading, setLoading] = useState(() => {
    if (!enabled) return false
    if (skipCache) return true
    return !cache.has(cacheKey)
  })
  
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState(null)
  const activeControllerRef = useRef(null)

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return

    if (activeControllerRef.current) {
      activeControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    activeControllerRef.current = controller

    const hasCache = cache.has(cacheKey) && !skipCache
    
    if (hasCache && !force) {
      setData(cache.get(cacheKey))
      setLoading(false)
      setIsValidating(true)
    } else {
      setLoading(true)
      setIsValidating(false)
    }

    try {
      const response = await client.get(url, {
        params,
        signal: controller.signal
      })
      
      const responseData = response.data
      if (!skipCache) {
        cache.set(cacheKey, responseData)
      }
      setData(responseData)
      setError(null)
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
        return
      }
      setError(err)
    } finally {
      if (activeControllerRef.current === controller) {
        setLoading(false)
        setIsValidating(false)
      }
    }
  }, [url, serializedParams, enabled, skipCache, cacheKey])

  useEffect(() => {
    fetchData()
    return () => {
      if (activeControllerRef.current) {
        activeControllerRef.current.abort()
      }
    }
  }, [fetchData])

  useEffect(() => {
    if (!enabled || !refetchInterval) return
    const id = setInterval(() => {
      fetchData(true)
    }, refetchInterval)
    return () => clearInterval(id)
  }, [fetchData, enabled, refetchInterval])

  const invalidate = () => {
    if (!skipCache) {
      cache.delete(cacheKey)
    }
    fetchData(true)
  }

  return { data, loading, isValidating, error, invalidate, mutate: setData }
}

export function useMutation(mutationFn, options = {}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = async (variables) => {
    setLoading(true)
    setError(null)
    let context = null
    try {
      if (options.onMutate) {
        context = await options.onMutate(variables)
      }
      const result = await mutationFn(variables)
      if (options.onSuccess) {
        options.onSuccess(result, variables, context)
      }
      return result
    } catch (err) {
      setError(err)
      if (options.onError) {
        options.onError(err, variables, context)
      }
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { execute, loading, error }
}
