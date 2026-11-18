import { useQuery } from '@tanstack/react-query'
import {
  getDashboardOverview,
  getDashboardActivity,
  getRiskDistribution,
  getSystemHealth,
} from '@/services/api'

export function useDashboard(activityRange = '24h') {
  const isDocumentVisible = typeof document !== 'undefined' ? !document.hidden : true

  const overviewQuery = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const { data } = await getDashboardOverview()
      return data
    },
    refetchInterval: isDocumentVisible ? 15000 : false,
  })

  const activityQuery = useQuery({
    queryKey: ['dashboard-activity', activityRange],
    queryFn: async () => {
      const { data } = await getDashboardActivity(activityRange)
      return data
    },
    refetchInterval: isDocumentVisible ? 15000 : false,
  })

  const riskDistributionQuery = useQuery({
    queryKey: ['dashboard-risk-distribution'],
    queryFn: async () => {
      const { data } = await getRiskDistribution()
      return data
    },
    refetchInterval: isDocumentVisible ? 15000 : false,
  })

  const healthQuery = useQuery({
    queryKey: ['system-health'],
    queryFn: async () => {
      const { data } = await getSystemHealth()
      return data
    },
    refetchInterval: isDocumentVisible ? 30000 : false,
  })

  return {
    overview: overviewQuery.data,
    isOverviewLoading: overviewQuery.isLoading,
    overviewError: overviewQuery.error,

    activity: activityQuery.data,
    isActivityLoading: activityQuery.isLoading,

    riskDistribution: riskDistributionQuery.data,
    isRiskDistributionLoading: riskDistributionQuery.isLoading,

    health: healthQuery.data,
    isHealthLoading: healthQuery.isLoading,

    refetchAll: () => {
      overviewQuery.refetch()
      activityQuery.refetch()
      riskDistributionQuery.refetch()
      healthQuery.refetch()
    },
  }
}
