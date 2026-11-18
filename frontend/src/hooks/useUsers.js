import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUsers,
  getUserDetail,
  createUser,
  updateUser,
  deactivateUser,
  getUserLogins,
  getUserDevices,
} from '@/services/api'

export function useUsers(params = {}) {
  const queryClient = useQueryClient()

  const usersQuery = useQuery({
    queryKey: ['users', params],
    queryFn: async () => {
      const { data } = await getUsers(params)
      return data
    },
    keepPreviousData: true,
  })

  const createMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await createUser(payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      const res = await updateUser(id, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const deactivateMutation = useMutation({
    mutationFn: async (id) => {
      const { data } = await deactivateUser(id)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return {
    users: usersQuery.data?.items || [],
    total: usersQuery.data?.total || 0,
    page: usersQuery.data?.page || 1,
    pageSize: usersQuery.data?.page_size || 25,
    isLoading: usersQuery.isLoading,
    isFetching: usersQuery.isFetching,
    error: usersQuery.error,
    refetch: usersQuery.refetch,
    createUser: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateUser: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
    deactivateUser: deactivateMutation.mutateAsync,
    isDeactivating: deactivateMutation.isPending,
  }
}

export function useUserDetail(id) {
  return useQuery({
    queryKey: ['user-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data } = await getUserDetail(id)
      return data
    },
    enabled: !!id,
  })
}

export function useUserLogins(id, params = {}) {
  return useQuery({
    queryKey: ['user-logins', id, params],
    queryFn: async () => {
      if (!id) return { items: [], total: 0 }
      const { data } = await getUserLogins(id, params)
      return data
    },
    enabled: !!id,
  })
}

export function useUserDevices(id) {
  return useQuery({
    queryKey: ['user-devices', id],
    queryFn: async () => {
      if (!id) return []
      const { data } = await getUserDevices(id)
      return data
    },
    enabled: !!id,
  })
}
