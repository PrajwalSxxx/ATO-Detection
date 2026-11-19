import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Cpu,
  Lock,
  ArrowRight,
  Phone,
  ShieldCheck,
  UserPlus,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { verifyOTP, resendOTP, registerUser, verifyRegistrationOTP } from '@/services/api'
import { LoginForm } from '@/components/features/auth/LoginForm'
import { RegisterForm } from '@/components/features/auth/RegisterForm'
import { OTPInput } from '@/components/features/auth/OTPInput'
import { BlockedState } from '@/components/features/auth/BlockedState'
import { LoginHeroIllustration } from '@/assets/illustrations/LoginHeroIllustration'
import { WindowFrame } from '@/components/ui/WindowFrame'
import { ROUTES } from '@/constants/routes'
import { notify } from '@/components/ui/Toast'
import { getDeviceFingerprint } from '@/utils/fingerprint'
import { discoverClientPublicIP } from '@/utils/ipDiscovery'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, setTokenAndUser } = useAuth()

  // Steps: 'login' | 'register' | 'register_verify' | 'mfa' | 'blocked'
  const [step, setStep] = useState('login')
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [mfaData, setMfaData] = useState(null)
  const [registrationData, setRegistrationData] = useState(null)
  const [blockedReferenceId, setBlockedReferenceId] = useState('')
  const [showDemoAccounts, setShowDemoAccounts] = useState(true)
  const [selectedAccount, setSelectedAccount] = useState(null)

  // Seeded demo accounts matching backend database
  const demoAccounts = [
    { email: 'admin@ato-platform.com', pass: 'Admin@SecurePass123', role: 'System Admin' },
    { email: 'analyst@ato-platform.com', pass: 'Analyst@SecurePass123', role: 'Security Analyst' },
    { email: 'user1@test.com', pass: 'User@SecurePass123', role: 'Alice Johnson (MFA)' },
    { email: 'user2@test.com', pass: 'User@SecurePass123', role: 'Bob Smith' },
  ]

  const handleLoginSubmit = async (formData) => {
    setIsLoading(true)
    setServerError('')
    try {
      let fpData = null
      try {
        fpData = await getDeviceFingerprint()
      } catch (fpErr) {
        console.warn('Device fingerprint collection note:', fpErr)
      }

      let discoveredIP = null
      try {
        discoveredIP = await discoverClientPublicIP()
      } catch (ipErr) {
        // Safe to ignore
      }

      const payload = {
        ...formData,
        ...(fpData ? {
          device_fingerprint: fpData.fingerprint,
          device_category: fpData.deviceCategory,
        } : {}),
        ...(discoveredIP ? { client_reported_ip: discoveredIP } : {}),
      }

      const response = await login(payload)

      // Normalize decision returned by API (case-insensitive)
      const rawDecision = String(response.decision || (response.access_token ? 'ALLOW' : 'REQUIRE_MFA')).toUpperCase()
      const isAllow = rawDecision === 'ALLOW' || (!!response.access_token && !response.mfa_required)
      const isMFA = rawDecision === 'REQUIRE_MFA' || rawDecision === 'MFA' || !!response.mfa_required
      const isBlock = rawDecision === 'BLOCK' || !!response.blocked

      if (isAllow) {
        notify.success('Authentication successful')
        navigate(ROUTES.DASHBOARD)
      } else if (isMFA) {
        setMfaData({
          email: formData.email,
          login_event_id: response.login_event_id,
          dev_otp: response.dev_otp,
          destination_masked: response.destination_masked,
          delivery_status: response.delivery_status,
          delivery_channel: response.delivery_channel || 'sms',
          temp_token: response.temp_token || response.session_token || response.login_event_id || 'temp-session-token',
        })
        setStep('mfa')
        if (response.dev_otp) {
          notify.info(`Adaptive MFA required. Dev OTP: ${response.dev_otp}`, { duration: 12000 })
        } else {
          notify.info(`Adaptive MFA required. Code sent to ${response.destination_masked || 'registered mobile'}`)
        }
      } else if (isBlock) {
        setBlockedReferenceId(response.reference_id || response.login_event_id || response.incident_id || 'INC-' + Date.now())
        setStep('blocked')
      }
    } catch (err) {
      const msg = err.normalizedMessage || 'Invalid email or password'
      setServerError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (formData) => {
    setIsLoading(true)
    setServerError('')
    try {
      const payload = {
        email: formData.email,
        password: formData.password,
        full_name: formData.fullName,
        phone_number: formData.phone,
      }
      const { data } = await registerUser(payload)
      setRegistrationData({
        user_id: data.user_id,
        email: data.email,
        phone_number_masked: data.phone_number_masked,
        dev_otp: data.dev_otp,
        delivery_status: data.delivery_status,
      })
      setStep('register_verify')
      if (data.dev_otp) {
        notify.info(`Verification code generated. Dev OTP: ${data.dev_otp}`, { duration: 12000 })
      } else {
        notify.info(`SMS verification code dispatched to ${data.phone_number_masked}`)
      }
    } catch (err) {
      setServerError(err.normalizedMessage || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyRegistrationOTP = async (otpCode) => {
    setIsLoading(true)
    setServerError('')
    try {
      const { data } = await verifyRegistrationOTP({
        email: registrationData?.email,
        user_id: registrationData?.user_id,
        otp: otpCode,
      })
      notify.success('Mobile verified! Registration successfully completed.')
      if (data.access_token) {
        setTokenAndUser(data.access_token, {
          email: data.email,
          role: 'user',
          phone_verified: true,
        })
        navigate(ROUTES.DASHBOARD)
      } else {
        setStep('login')
        notify.info('You may now sign in with your credentials')
      }
    } catch (err) {
      setServerError(err.normalizedMessage || 'Verification failed. Please check the OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendRegistrationOTP = async () => {
    try {
      const { data } = await resendOTP({
        email: registrationData?.email,
        purpose: 'registration_verify',
      })
      if (data?.dev_otp) {
        setRegistrationData((prev) => ({ ...prev, dev_otp: data.dev_otp }))
        notify.success(`New OTP generated. Dev OTP: ${data.dev_otp}`, { duration: 12000 })
      } else {
        notify.success(`New verification code sent to ${registrationData?.phone_number_masked || 'your phone'}`)
      }
    } catch (err) {
      notify.error(err.normalizedMessage || 'Failed to resend OTP')
    }
  }

  const handleVerifyOTP = async (otpCode) => {
    setIsLoading(true)
    setServerError('')
    try {
      const { data } = await verifyOTP({
        email: mfaData?.email,
        login_event_id: mfaData?.login_event_id,
        otp: otpCode,
        temp_token: mfaData?.temp_token,
      })

      if (data.access_token) {
        const userData = data.user || { email: data.email, role: data.role }
        setTokenAndUser(data.access_token, userData)
        notify.success('Identity verified successfully')
        navigate(ROUTES.DASHBOARD)
      } else {
        setServerError('Invalid one-time passcode. Please try again.')
      }
    } catch (err) {
      setServerError(err.normalizedMessage || 'Verification failed. Please check the OTP.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    try {
      const { data } = await resendOTP({
        email: mfaData?.email,
        login_event_id: mfaData?.login_event_id,
        temp_token: mfaData?.temp_token,
        purpose: 'login_mfa',
      })
      if (data?.dev_otp) {
        setMfaData((prev) => ({ ...prev, dev_otp: data.dev_otp }))
        notify.success(`New OTP generated. Dev OTP: ${data.dev_otp}`, { duration: 12000 })
      } else {
        notify.success(`New OTP sent to ${mfaData?.destination_masked || 'your registered mobile'}`)
      }
    } catch (err) {
      notify.error(err.normalizedMessage || 'Failed to resend OTP')
    }
  }

  return (
    <div className="min-h-screen bg-paper flex flex-col lg:flex-row text-ink selection:bg-ink selection:text-paper">
      {/* Left Column: Platform Branding & Architecture Overview */}
      <div className="lg:w-1/2 p-8 sm:p-12 lg:p-16 flex flex-col justify-between bg-paper border-b lg:border-b-0 lg:border-r border-line-soft relative">
        {/* Top Header */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-paper-sunken border border-line-soft text-ink-2 text-xs font-mono mb-6">
            <Cpu className="w-3.5 h-3.5 text-ink" />
            <span>REAL-TIME_ISOLATION_FOREST_PIPELINE</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-normal tracking-tight text-ink">
            AI-ATO Sentinel
          </h1>
          <p className="text-ink-2 mt-2.5 text-sm sm:text-base leading-relaxed max-w-lg">
            High-throughput Account Takeover (ATO) defense platform combining Isolation Forest
            anomaly scoring with deterministic security heuristics.
          </p>
        </div>

        {/* Isometric Stacked Wireframe Architectural Illustration */}
        <div className="my-8 border border-line-soft rounded-[12px] p-4 bg-paper-raised relative z-10 shadow-sm">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-line-soft">
            <span className="text-[10px] font-mono uppercase tracking-wider text-ink-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-ink" />
              LAYERED_EVALUATION_PLANE
            </span>
            <span className="text-[10px] font-mono text-ink bg-paper-sunken px-2 py-0.5 rounded-[4px] border border-line-soft font-medium">
              3-TIER_ISOLATION
            </span>
          </div>
          <div className="py-2">
            <LoginHeroIllustration className="max-h-[180px] mx-auto" />
          </div>
        </div>

        {/* Center: The 3 Decisions Explained */}
        <div className="space-y-2.5 relative z-10">
          <div className="text-[11px] font-mono uppercase tracking-wider text-ink-3 font-semibold mb-2">
            Automated Decision Outcomes
          </div>

          {/* ALLOW */}
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[#E6F1EA]/60 border border-[#2F7D5B]/30">
            <div className="w-6 h-6 rounded-full bg-[#E6F1EA] border border-[#2F7D5B]/40 flex items-center justify-center text-[#2F7D5B] shrink-0 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#2F7D5B] flex items-center gap-2">
                ALLOW <span className="text-ink-3 font-mono font-normal text-[11px]">(Score 0–30)</span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                Baseline behavioral profile verified. Session token issued immediately with frictionless access.
              </p>
            </div>
          </div>

          {/* REQUIRE_MFA */}
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[#F8EFD9]/60 border border-[#B7791F]/30">
            <div className="w-6 h-6 rounded-full bg-[#F8EFD9] border border-[#B7791F]/40 flex items-center justify-center text-[#B7791F] shrink-0 mt-0.5">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#B7791F] flex items-center gap-2">
                REQUIRE_MFA <span className="text-ink-3 font-mono font-normal text-[11px]">(Score 31–70)</span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                New device fingerprint or off-hours deviation. Escalates to step-up OTP challenge.
              </p>
            </div>
          </div>

          {/* BLOCK */}
          <div className="flex items-start gap-3 p-3 rounded-[8px] bg-[#F6E2DE]/60 border border-[#B3382C]/30">
            <div className="w-6 h-6 rounded-full bg-[#F6E2DE] border border-[#B3382C]/40 flex items-center justify-center text-[#B3382C] shrink-0 mt-0.5">
              <ShieldAlert className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#B3382C] flex items-center gap-2">
                BLOCK <span className="text-ink-3 font-mono font-normal text-[11px]">(Score 71–100)</span>
              </div>
              <p className="text-xs text-ink-2 mt-0.5">
                Known malicious ASN, credential spray velocity, or impossible travel speed. Immediate termination.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Footer info */}
        <div className="text-xs text-ink-3 relative z-10 flex items-center justify-between border-t border-line-soft pt-4 mt-6 font-mono">
          <span>Enterprise SecOps Edition</span>
          <span>v2.4.0</span>
        </div>
      </div>

      {/* Right Column: Dynamic Form Container */}
      <div className="lg:w-1/2 p-6 sm:p-12 lg:p-16 flex flex-col items-center justify-center bg-paper-sunken/40">
        <div className="w-full max-w-md">
          <AnimatePresence mode="wait">
            {step === 'login' && (
              <motion.div
                key="login-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <WindowFrame
                  title="AUTHENTICATION_GATEWAY"
                  hardShadow
                  className="w-full"
                >
                  <div className="p-6">
                    <div className="mb-5">
                      <h2 className="text-2xl font-serif font-normal text-ink">
                        Sign In
                      </h2>
                      <p className="text-xs text-ink-2 mt-1">
                        Enter your credentials to access the real-time security console.
                      </p>
                    </div>

                    <LoginForm
                      onSubmit={handleLoginSubmit}
                      isLoading={isLoading}
                      serverError={serverError}
                      initialValues={selectedAccount}
                    />

                    {/* Register Option */}
                    <div className="mt-4 pt-3 border-t border-line-soft flex items-center justify-between text-xs">
                      <span className="text-ink-3">New user?</span>
                      <button
                        type="button"
                        onClick={() => {
                          setServerError('')
                          setStep('register')
                        }}
                        className="font-mono text-ink hover:underline font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5 text-ink-2" />
                        Register with Mobile OTP
                      </button>
                    </div>

                    {/* Demo Credentials Collapsible */}
                    <div className="mt-6 border border-line-dashed rounded-[8px] bg-paper-sunken/50 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setShowDemoAccounts(!showDemoAccounts)}
                        className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-mono font-medium text-ink-2 hover:text-ink transition-colors text-left"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-ink" />
                          Demo Credentials (1-Click Fill)
                        </span>
                        {showDemoAccounts ? (
                          <ChevronUp className="w-4 h-4 text-ink-3" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-ink-3" />
                        )}
                      </button>

                      {showDemoAccounts && (
                        <div className="p-2.5 pt-0 border-t border-line-soft space-y-1.5 text-xs">
                          {demoAccounts.map((acc) => (
                            <button
                              key={acc.email}
                              type="button"
                              onClick={() => {
                                setSelectedAccount({ email: acc.email, password: acc.pass })
                                notify.info(`Loaded ${acc.role} credentials`)
                              }}
                              className="w-full text-left p-2 rounded-[6px] bg-paper-raised hover:bg-paper-hover border border-line-soft hover:border-ink transition-all flex items-center justify-between font-mono text-[11px] group cursor-pointer"
                            >
                              <div className="truncate mr-2">
                                <span className="text-ink font-medium block truncate">
                                  {acc.email}
                                </span>
                                <span className="text-ink-3 text-[10px]">Pass: {acc.pass}</span>
                              </div>
                              <span className="text-ink bg-paper-sunken border border-line-soft px-1.5 py-0.5 rounded text-[10px] shrink-0 font-mono">
                                {acc.role}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </WindowFrame>
              </motion.div>
            )}

            {step === 'register' && (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <WindowFrame
                  title="USER_REGISTRATION"
                  hardShadow
                  className="w-full"
                >
                  <div className="p-6">
                    <div className="mb-5">
                      <h2 className="text-2xl font-serif font-normal text-ink">
                        Create Account
                      </h2>
                      <p className="text-xs text-ink-2 mt-1">
                        Register with a verified mobile number for adaptive SMS security challenges.
                      </p>
                    </div>

                    <RegisterForm
                      onSubmit={handleRegisterSubmit}
                      isLoading={isLoading}
                      serverError={serverError}
                    />

                    <div className="mt-4 pt-3 border-t border-line-soft text-center text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setServerError('')
                          setStep('login')
                        }}
                        className="font-mono text-ink-3 hover:text-ink underline transition-colors"
                      >
                        Already registered? Return to Sign In
                      </button>
                    </div>
                  </div>
                </WindowFrame>
              </motion.div>
            )}

            {step === 'register_verify' && (
              <motion.div
                key="register-verify-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <WindowFrame
                  title="MOBILE_OWNERSHIP_VERIFICATION"
                  hardShadow
                  className="w-full"
                >
                  <div className="p-6 text-center space-y-5">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-600 mx-auto shadow-sm">
                      <ShieldCheck className="w-6 h-6" />
                    </div>

                    <div>
                      <h2 className="text-xl font-serif font-normal text-ink">
                        Verify Mobile Number
                      </h2>
                      <p className="text-xs text-ink-2 mt-1 max-w-sm mx-auto">
                        Please enter the 6-digit confirmation code sent via SMS to verify mobile device ownership.
                      </p>
                    </div>

                    <div className="p-3 rounded-[8px] bg-paper-sunken border border-line-soft text-center space-y-1">
                      <span className="text-[11px] font-mono text-ink-2">
                        SMS verification code dispatched to:
                      </span>
                      <div className="font-mono font-bold text-sm text-ink flex items-center justify-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {registrationData?.phone_number_masked || 'Registered Mobile'}
                      </div>
                      <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase font-semibold">
                        {registrationData?.delivery_status === 'mock_delivered' ? 'MOCK SMS DELIVERED' : (registrationData?.delivery_status || 'SMS SENT')}
                      </span>
                    </div>

                    {registrationData?.dev_otp && (
                      <div className="p-3 rounded-[8px] bg-paper-sunken border border-line-soft text-center">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-ink-3 block">
                          Local Dev Registration OTP
                        </span>
                        <span className="text-xl font-mono font-bold tracking-widest text-ink mt-1 block">
                          {registrationData.dev_otp}
                        </span>
                      </div>
                    )}

                    <OTPInput
                      length={6}
                      onComplete={handleVerifyRegistrationOTP}
                      onResend={handleResendRegistrationOTP}
                      isLoading={isLoading}
                      error={serverError}
                    />

                    <button
                      type="button"
                      onClick={() => {
                        setServerError('')
                        setStep('register')
                      }}
                      className="text-xs font-mono text-ink-3 hover:text-ink underline transition-colors"
                    >
                      Use a different mobile number
                    </button>
                  </div>
                </WindowFrame>
              </motion.div>
            )}

            {step === 'mfa' && (
              <motion.div
                key="mfa-step"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.18 }}
              >
                <WindowFrame
                  title="STEP_UP_CHALLENGE"
                  hardShadow
                  className="w-full"
                >
                  <div className="p-6 text-center space-y-5">
                    <div className="w-12 h-12 rounded-full bg-[#F8EFD9] border border-[#B7791F]/40 flex items-center justify-center text-[#B7791F] mx-auto shadow-sm">
                      <Lock className="w-5 h-5" />
                    </div>

                    <div>
                      <h2 className="text-xl font-serif font-normal text-ink">
                        Step-Up Verification Required
                      </h2>
                      <p className="text-xs text-ink-2 mt-1 max-w-sm mx-auto">
                        A 6-digit confirmation passcode was issued via SMS for this authentication attempt.
                      </p>
                    </div>

                    <div className="p-3 rounded-[8px] bg-paper-sunken border border-line-soft text-center space-y-1">
                      <span className="text-[11px] font-mono text-ink-2">
                        SMS passcode dispatched to:
                      </span>
                      <div className="font-mono font-bold text-sm text-ink flex items-center justify-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        {mfaData?.destination_masked || 'Registered Mobile'}
                      </div>
                      <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 uppercase font-semibold">
                        {mfaData?.delivery_status === 'mock_delivered' ? 'MOCK SMS DELIVERED' : (mfaData?.delivery_status || 'SMS SENT')}
                      </span>
                    </div>

                    {mfaData?.dev_otp && (
                      <div className="p-3 rounded-[8px] bg-paper-sunken border border-line-soft text-center">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-ink-3 block">
                          Local Dev One-Time Passcode
                        </span>
                        <span className="text-xl font-mono font-bold tracking-widest text-ink mt-1 block">
                          {mfaData.dev_otp}
                        </span>
                      </div>
                    )}

                    <OTPInput
                      length={6}
                      onComplete={handleVerifyOTP}
                      onResend={handleResendOTP}
                      isLoading={isLoading}
                      error={serverError}
                    />

                    <button
                      type="button"
                      onClick={() => setStep('login')}
                      className="text-xs font-mono text-ink-3 hover:text-ink underline transition-colors"
                    >
                      Use a different account
                    </button>
                  </div>
                </WindowFrame>
              </motion.div>
            )}

            {step === 'blocked' && (
              <motion.div
                key="blocked-step"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <BlockedState
                  referenceId={blockedReferenceId}
                  onBackToLogin={() => setStep('login')}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
