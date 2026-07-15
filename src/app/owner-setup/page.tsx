'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, User, Mail, KeyRound, CheckCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

const setupSchema = z.object({
  fullName: z.string().min(2, { message: 'Full name must be at least 2 characters' }),
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
});

type SetupValues = z.infer<typeof setupSchema>;

export default function OwnerSetupPage() {
  const [checking, setChecking] = useState(true);
  const [ownerExists, setOwnerExists] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SetupValues>({
    resolver: zodResolver(setupSchema),
  });

  useEffect(() => {
    const checkOwner = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'owner')
          .limit(1);

        if (error) {
          console.error(error);
          setErrorMsg('Error checking database status. Please verify migrations are applied.');
        } else if (data && data.length > 0) {
          setOwnerExists(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setChecking(false);
      }
    };

    checkOwner();
  }, [supabase]);

  const onSubmit = async (values: SetupValues) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      // Call auth.signUp which will trigger trigger_new_user and create the profile
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            full_name: values.fullName,
            role: 'owner',
          },
        },
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-zinc-400 text-sm">Checking system status...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0b] px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center font-bold text-black text-3xl mb-4 border border-zinc-700 shadow-lg shadow-primary/10">
            T
          </div>
          <h2 className="text-2xl font-extrabold text-white tracking-wide">
            Thennakoon Tours
          </h2>
          <p className="mt-1 text-sm text-zinc-400 font-medium uppercase tracking-wider">
            System Initialization
          </p>
        </div>

        <div className="bg-[#151516] border border-zinc-800 rounded-2xl p-8 shadow-xl">
          {ownerExists ? (
            <div className="text-center space-y-4 py-4">
              <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto" />
              <h3 className="text-lg font-bold text-white">Setup Disabled</h3>
              <p className="text-sm text-zinc-400">
                The Owner account has already been registered for this system.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-flex justify-center rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-black hover:bg-yellow-500 transition-colors"
                >
                  Go to Login
                </Link>
              </div>
            </div>
          ) : success ? (
            <div className="text-center space-y-4 py-4">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto animate-pulse" />
              <h3 className="text-lg font-bold text-white">Initialization Complete!</h3>
              <p className="text-sm text-zinc-400">
                The system owner has been registered successfully.
              </p>
              <p className="text-xs text-primary font-medium">
                Redirecting to login page...
              </p>
            </div>
          ) : (
            <>
              <h3 className="text-lg font-bold text-white mb-2">Create Owner Account</h3>
              <p className="text-xs text-zinc-400 mb-6">
                Register the primary owner account to initialize the system.
              </p>

              {errorMsg && (
                <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-4 text-sm text-red-400">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <User size={16} />
                    </span>
                    <input
                      id="fullName"
                      type="text"
                      placeholder="Admin Owner"
                      {...register('fullName')}
                      className={`block w-full rounded-xl border bg-zinc-950 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 ${
                        errors.fullName
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-zinc-800 focus:border-primary focus:ring-primary'
                      }`}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">
                      {errors.fullName.message}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <Mail size={16} />
                    </span>
                    <input
                      id="email"
                      type="email"
                      placeholder="owner@thennakoontours.com"
                      {...register('email')}
                      className={`block w-full rounded-xl border bg-zinc-950 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 ${
                        errors.email
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-zinc-800 focus:border-primary focus:ring-primary'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">
                      {errors.email.message}
                    </p>
                  )}
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                      <KeyRound size={16} />
                    </span>
                    <input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      {...register('password')}
                      className={`block w-full rounded-xl border bg-zinc-950 py-3 pl-10 pr-4 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 ${
                        errors.password
                          ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
                          : 'border-zinc-800 focus:border-primary focus:ring-primary'
                      }`}
                    />
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs text-red-500 font-medium">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-black transition-colors hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      Initializing...
                    </>
                  ) : (
                    'Initialize System'
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center text-xs text-zinc-500">
          Already initialized?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
}
