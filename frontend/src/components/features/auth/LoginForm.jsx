import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

export function LoginForm({ onSubmit, isLoading = false, serverError, initialValues }) {
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: initialValues?.email || '',
      password: initialValues?.password || '',
    },
  })

  useEffect(() => {
    if (initialValues?.email) {
      setValue('email', initialValues.email, { shouldValidate: true })
    }
    if (initialValues?.password) {
      setValue('password', initialValues.password, { shouldValidate: true })
    }
  }, [initialValues, setValue])

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
        label="Work Email"
        type="email"
        placeholder="analyst@ato-sentinel.internal"
        leftIcon={<Mail className="w-4 h-4" />}
        error={errors.email?.message}
        required
        {...register('email')}
      />

      <Input
        label="Password"
        type={showPassword ? 'text' : 'password'}
        placeholder="••••••••••••"
        leftIcon={<Lock className="w-4 h-4" />}
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
        Sign In to Platform
      </Button>
    </form>
  )
}
