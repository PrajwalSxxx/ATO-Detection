import { useMutation, useQueryClient } from '@tanstack/react-query'
import { simulateLogin, resetDemoData } from '@/services/api'

export function useSimulator() {
  const queryClient = useQueryClient()

  const runScenarioMutation = useMutation({
    mutationFn: async (payload) => {
      const { data } = await simulateLogin(payload)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logins'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard-overview'] })
      queryClient.invalidateQueries({ queryKey: ['alerts'] })
    },
  })

  const resetMutation = useMutation({
    mutationFn: async () => {
      const { data } = await resetDemoData()
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries()
    },
  })

  return {
    runScenario: runScenarioMutation.mutateAsync,
    isRunning: runScenarioMutation.isPending,
    lastResult: runScenarioMutation.data,
    scenarioError: runScenarioMutation.error,

    resetDemo: resetMutation.mutateAsync,
    isResetting: resetMutation.isPending,
  }
}
