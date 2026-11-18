import { useQuery } from '@tanstack/react-query'
import { getDevices, getDeviceDetail } from '@/services/api'

export function useDevices(params = {}) {
  const devicesQuery = useQuery({
    queryKey: ['devices', params],
    queryFn: async () => {
      const { data } = await getDevices(params)
      return data
    },
    keepPreviousData: true,
  })

  return {
    devices: devicesQuery.data?.items || [],
    total: devicesQuery.data?.total || 0,
    page: devicesQuery.data?.page || 1,
    pageSize: devicesQuery.data?.page_size || 25,
    isLoading: devicesQuery.isLoading,
    isFetching: devicesQuery.isFetching,
    error: devicesQuery.error,
    refetch: devicesQuery.refetch,
  }
}

export function useDeviceDetail(id) {
  return useQuery({
    queryKey: ['device-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data } = await getDeviceDetail(id)
      return data
    },
    enabled: !!id,
  })
}
