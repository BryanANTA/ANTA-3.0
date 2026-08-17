import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function LoginPage() {
  const { signIn, authError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try { await signIn(email, password); } catch { /* message is displayed */ }
    finally { setBusy(false); }
  };
  return <main className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
    <form onSubmit={submit} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl space-y-5">
      <div><p className="text-xs font-bold tracking-[0.25em] text-red-600">ANTA</p><h1 className="text-2xl font-bold">Pulse Pro</h1><p className="mt-1 text-sm text-slate-500">Sign in to access the catalogue.</p></div>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
      {authError?.message && <p className="text-sm text-red-600">{authError.message}</p>}
      <Button className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
    </form>
  </main>;
}
