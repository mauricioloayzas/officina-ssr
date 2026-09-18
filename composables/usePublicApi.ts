import type { ApiResponse } from '~/types'

type PublicService = 'auth' | 'officina'

export function usePublicApi(service: PublicService) {
  const config = useRuntimeConfig()

  const baseUrl = service === 'officina' ? config.public.apiOfficinaBase : config.public.apiAuthBase

  async function get<T>(endpoint: string, query?: Record<string, string>): Promise<ApiResponse<T>> {
    const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
    return await $fetch<ApiResponse<T>>(`${baseUrl}${endpoint}${qs}`)
  }

  async function post<T>(endpoint: string, body: unknown): Promise<ApiResponse<T>> {
    return await $fetch<ApiResponse<T>>(`${baseUrl}${endpoint}`, {
      method: 'POST',
      body: body as Record<string, unknown>,
    })
  }

  return { get, post }
}
