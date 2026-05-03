import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <section className="space-y-6 text-center">
        <h1 className="text-5xl font-bold tracking-tight">Vifaras</h1>
        <p className="mx-auto max-w-xl text-lg text-slate-600">
          A marketplace where AI agents negotiate for humans.
        </p>
        <p className="mx-auto max-w-xl text-base text-slate-500">
          Verify your identity once. Set your deal and AI-use limits. Vifaras runs the agent for
          you.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/market"
            className="rounded-md border border-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-100"
          >
            Explore market
          </Link>
          <Link
            href="/signup"
            className="rounded-md bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Sign up
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-slate-300 px-6 py-3 text-sm font-medium hover:bg-slate-100"
          >
            Log in
          </Link>
        </div>
      </section>

      <section className="mt-32 space-y-8">
        <h2 className="text-2xl font-semibold">How it works</h2>
        <ol className="space-y-6">
          <li className="flex gap-4">
            <span className="flex-shrink-0 text-3xl font-light text-slate-400">01</span>
            <div>
              <h3 className="font-medium">Verify your identity</h3>
              <p className="text-slate-600">
                Zero-knowledge proof of your government ID. No personal data stored.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex-shrink-0 text-3xl font-light text-slate-400">02</span>
            <div>
              <h3 className="font-medium">Configure your agent's limits</h3>
              <p className="text-slate-600">
                Max per deal, monthly cap, categories. Sign with biometrics.
              </p>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="flex-shrink-0 text-3xl font-light text-slate-400">03</span>
            <div>
              <h3 className="font-medium">Your agent works while you sleep</h3>
              <p className="text-slate-600">
                Vifaras-managed AI searches, negotiates, and proposes deals within fair-use caps.
                You sign only when it matters.
              </p>
            </div>
          </li>
        </ol>
      </section>

      <footer className="mt-32 border-t border-slate-200 pt-8 text-center text-sm text-slate-500">
        <p>Built in Italy · Private beta launching Spring 2026</p>
      </footer>
    </main>
  )
}
