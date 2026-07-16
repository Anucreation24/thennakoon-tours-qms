'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  AlertTriangle,
  KeyRound,
  Loader2,
  Mail,
} from 'lucide-react';

import { createClient } from '@/utils/supabase/client';

const loginSchema = z.object({
  email: z
    .string()
    .email({
      message: 'Please enter a valid email address',
    }),

  password: z
    .string()
    .min(6, {
      message: 'Password must be at least 6 characters',
    }),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [errorMsg, setErrorMsg] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),

    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (
    values: LoginValues
  ): Promise<void> => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const { error } =
        await supabase.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });

      if (error) {
        if (
          error.message ===
          'Invalid login credentials'
        ) {
          setErrorMsg(
            'Incorrect email or password. Please try again.'
          );
        } else if (
          error.message ===
          'Email not confirmed'
        ) {
          setErrorMsg(
            'This email address has not been confirmed. Please contact the system administrator.'
          );
        } else {
          setErrorMsg(
            'Unable to sign in. Please contact the system administrator.'
          );
        }

        return;
      }

      router.replace('/dashboard');
      router.refresh();
    } catch (error) {
      console.error(
        'Unexpected login error:',
        error
      );

      setErrorMsg(
        'An unexpected error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        {/* Branding header */}
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl border border-zinc-700 bg-primary text-3xl font-bold text-black shadow-lg shadow-primary/10">
            T
          </div>

          <h1 className="text-2xl font-extrabold tracking-wide text-white">
            Thennakoon Tours
          </h1>

          <p className="mt-1 text-sm font-medium uppercase tracking-wider text-zinc-400">
            Quotation Management System
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-zinc-800 bg-[#151516] p-8 shadow-xl">
          <h2 className="mb-6 text-lg font-bold text-white">
            Sign In
          </h2>

          {errorMsg && (
            <div
              role="alert"
              className="mb-6 flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400"
            >
              <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />

              <span>{errorMsg}</span>
            </div>
          )}

          <form
            className="space-y-6"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            {/* Email input */}
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Email Address
              </label>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Mail size={16} />
                </span>

                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="name@company.com"
                  disabled={loading}
                  {...register('email')}
                  className={`block w-full rounded-xl border bg-zinc-950 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors.email
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-zinc-800 focus:border-primary focus:ring-primary'
                  }`}
                />
              </div>

              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password input */}
            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
              >
                Password
              </label>

              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <KeyRound size={16} />
                </span>

                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  disabled={loading}
                  {...register('password')}
                  className={`block w-full rounded-xl border bg-zinc-950 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60 ${
                    errors.password
                      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                      : 'border-zinc-800 focus:border-primary focus:ring-primary'
                  }`}
                />
              </div>

              {errors.password && (
                <p className="mt-1.5 text-xs font-medium text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-black" />
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-zinc-600">
          Authorized staff access only
        </p>
      </div>
    </div>
  );
}
