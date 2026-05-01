import Link from 'next/link'
import { SignupForm } from '@/components/auth/signup-form'

export default function SignupPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="space-y-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">Create your account</h1>
          <p className="text-slate-600">Verify with passkey. No password needed.</p>
        </div>

        <SignupForm />

        <p className="text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  )
}
