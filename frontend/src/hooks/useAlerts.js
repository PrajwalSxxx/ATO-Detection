import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAlerts, getAlertDetail, updateAlertStatus, getUnresolvedAlertCount } from '@/services/api'

export function useAlerts(params = {}) {
  const queryClient = useQueryClient()

  const alertsQuery = useQuery({
    queryKey: ['alerts', params],
    queryFn: async () => {
      const { data } = await getAlerts(params)
      return data
    },
    keepPreviousData: true,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, note }) => {
      const { data } = await updateAlertStatus(id, { status, note })
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
      queryClient.invalidateQueries({ queryKey: ['unresolved-alert-count'] })
      queryClient.invalidateQueries({ queryKey: ['recent-unresolved-alerts'] })
    },
  })

  return {
    alerts: alertsQuery.data?.items || [],
    total: alertsQuery.data?.total || 0,
    page: alertsQuery.data?.page || 1,
    pageSize: alertsQuery.data?.page_size || 25,
    isLoading: alertsQuery.isLoading,
    isFetching: alertsQuery.isFetching,
    error: alertsQuery.error,
    refetch: alertsQuery.refetch,
    updateStatus: updateStatusMutation.mutateAsync,
    isUpdating: updateStatusMutation.isPending,
  }
}

export function useAlertDetail(id) {
  return useQuery({
    queryKey: ['alert-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data } = await getAlertDetail(id)
      return data
    },
    enabled: !!id,
  })
}
