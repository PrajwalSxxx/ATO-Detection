import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getLogins, getLoginDetail, simulateLogin } from '@/services/api'

export function useLogins(params = {}) {
  const queryClient = useQueryClient()

  const loginsQuery = useQuery({
    queryKey: ['logins', params],
    queryFn: async () => {
      const { data } = await getLogins(params)
      return data
    },
    keepPreviousData: true,
  })

  const simulateMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await simulateLogin(payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logins'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
    },
  })

  return {
    logins: loginsQuery.data?.items || [],
    total: loginsQuery.data?.total || 0,
    page: loginsQuery.data?.page || 1,
    pageSize: loginsQuery.data?.page_size || 25,
    isLoading: loginsQuery.isLoading,
    isFetching: loginsQuery.isFetching,
    error: loginsQuery.error,
    refetch: loginsQuery.refetch,
    simulateLogin: simulateMutation.mutateAsync,
    isSimulating: simulateMutation.isPending,
  }
}

export function useLoginDetail(id) {
  return useQuery({
    queryKey: ['login-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data } = await getLoginDetail(id)
      return data
    },
    enabled: !!id,
  })
}
