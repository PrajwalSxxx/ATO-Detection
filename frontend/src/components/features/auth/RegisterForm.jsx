import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Phone, User, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').optional().or(z.literal('')),
  email: z.string().min(1, 'Email is required').email('Please enter a valid work email address'),
  phone: z
    .string()
    .min(8, 'Please enter a valid mobile number')
    .max(18, 'Mobile number too long')
    .regex(/^[+0-9\s\-()]+$/, 'Mobile number contains invalid characters'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
})

export function RegisterForm({ onSubmit, isLoading = false, serverError }) {
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
      {serverError && (
        <div
          className="p-3 rounded bg-danger/10 border border-danger/30 text-xs text-danger font-medium"
          role="alert"
          aria-live="polite"
        >
          {serverError}
        </div>
      )}

      <Input
        label="Full Name"
        type="text"
        placeholder="e.g. Alice Johnson"
        leftIcon={<User className="w-4 h-4 text-ink-3" />}
        error={errors.fullName?.message}
        {...register('fullName')}
      />

      <Input
        label="Work Email"
        type="email"
        placeholder="alice@company.com"
        leftIcon={<Mail className="w-4 h-4 text-ink-3" />}
        error={errors.email?.message}
        required
        {...register('email')}
      />

      <div>
        <Input
          label="Mobile Phone Number"
          type="tel"
          placeholder="+91 98765 43210"
          leftIcon={<Phone className="w-4 h-4 text-ink-3" />}
          error={errors.phone?.message}
          required
          {...register('phone')}
        />
        <p className="text-[11px] text-ink-3 mt-1 font-mono">
          Supports Indian (10-digit / +91) and international formats (e.g. +1, +44).
        </p>
      </div>

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••••••"
        leftIcon={<Lock className="w-4 h-4 text-ink-3" />}
        rightIcon={
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-text-muted hover:text-text-primary focus:outline-none"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
        error={errors.password?.message}
        required
        {...register('password')}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full mt-2"
        rightIcon={<ArrowRight className="w-4 h-4" />}
      >
        Send Verification Code
      </Button>
    </form>
  )
}
