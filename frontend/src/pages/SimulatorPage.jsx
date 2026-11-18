import React from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SimulatorPanel } from '@/components/features/simulator/SimulatorPanel'
import { useSimulator } from '@/hooks/useSimulator'
import { useUsers } from '@/hooks/useUsers'
import { notify } from '@/components/ui/Toast'

export default function SimulatorPage() {
  const {
    runScenario,
    isRunning,
    lastResult,
    resetDemo,
    isResetting,
  } = useSimulator()

  const { users } = useUsers({ page_size: 50 })

  const handleRunSimulation = async (payload) => {
    try {
      await runScenario(payload)
      notify.success('Simulation executed through live ML pipeline')
    } catch (err) {
      notify.error(err.normalizedMessage || 'Simulation execution failed')
    }
  }

  const handleResetDemo = async () => {
    try {
      await resetDemo()
      notify.success('Demo environment and telemetry reset to seed state')
    } catch (err) {
      notify.error(err.normalizedMessage || 'Failed to reset demo data')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactive Threat Simulator"
        description="Trigger live simulated ATO attack vectors and observe immediate real-time ML risk scoring and adaptive decisions."
      />

      <SimulatorPanel
        users={users}
        onRunSimulation={handleRunSimulation}
        isRunning={isRunning}
        result={lastResult}
        onResetDemo={handleResetDemo}
        isResetting={isResetting}
      />
    </div>
  )
}
