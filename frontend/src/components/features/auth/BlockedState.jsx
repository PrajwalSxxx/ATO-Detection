import React from 'react'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { CopyableMono } from '@/components/ui/CopyableMono'
import { WindowFrame } from '@/components/ui/WindowFrame'

export function BlockedState({ referenceId, onBackToLogin }) {
  const refId = referenceId || `REQ-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

  return (
    <WindowFrame
      title="SECURITY_INTERCEPTION"
      hardShadow
      className="w-full max-w-md mx-auto"
    >
      <div className="p-6 text-center flex flex-col items-center">
        <div className="w-14 h-14 rounded-full bg-[#F6E2DE] border border-danger/40 flex items-center justify-center text-danger mb-4 shadow-sm">
          <ShieldAlert className="w-7 h-7" />
        </div>

        <h2 className="text-xl font-serif text-ink font-normal mb-2">
          Access Intercepted &amp; Blocked
        </h2>

        <p className="text-xs text-ink-2 leading-relaxed mb-6">
          This sign-in attempt triggered high-risk anomaly heuristics and was terminated by policy
          to safeguard the account.
        </p>

        {/* Reference identifier */}
        <div className="w-full bg-paper-sunken border border-line-soft rounded-[8px] p-3.5 mb-6 text-left">
          <div className="text-[10px] text-ink-3 font-mono font-semibold uppercase tracking-wider mb-1.5">
            Incident Reference Token
          </div>
          <div className="flex items-center justify-between">
            <CopyableMono text={refId} />
          </div>
          <p className="text-[11px] text-ink-3 mt-2 leading-normal">
            Provide this tracking code to your security administrator to initiate a manual review.
          </p>
        </div>

        {onBackToLogin && (
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            leftIcon={<ArrowLeft className="w-4 h-4" />}
            onClick={onBackToLogin}
          >
            Return to Sign In
          </Button>
        )}
      </div>
    </WindowFrame>
  )
}
