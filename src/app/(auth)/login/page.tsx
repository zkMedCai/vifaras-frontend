import Link from 'next/link'
import { LoginForm } from '@/components/auth/login-form'

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Log in</h1>
          <p className="text-slate-600">Authenticate with your passkey.</p>
        </div>

        <LoginForm />

        <p className="text-center text-sm text-slate-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  )
}
