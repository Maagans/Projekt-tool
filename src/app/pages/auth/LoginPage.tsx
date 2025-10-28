import { useState } from 'react';

type LoginPageProps = {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  onNavigateToRegister: () => void;
};

export const LoginPage = ({ onLogin, onNavigateToRegister }: LoginPageProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsLoggingIn(true);
    const result = await onLogin(email, password);
    if (!result.success) {
      setError(result.message || 'Login fejlede.');
    }
    setIsLoggingIn(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Projektværktøj</h1>
          <p className="text-slate-500">Log ind for at fortsætte</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Adgangskode</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait"
            >
              {isLoggingIn ? 'Logger ind...' : 'Log ind'}
            </button>
          </div>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500 space-y-2">
          <p>
            Har du ikke en konto?{' '}
            <button onClick={onNavigateToRegister} className="font-semibold text-blue-600 hover:underline">
              Registrer her
            </button>
          </p>
          <p className="text-slate-400">
            Demo: <b>projektleder@sano.dk</b> / <b>password</b>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

