import { useState } from 'react';
import { Link } from 'react-router-dom';

import { BrandLogo } from '../../../components/branding/BrandLogo';

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
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-slate-200">
        <div className="text-center mb-8 flex flex-col items-center">
          <BrandLogo className="h-40 w-40 mb-4" />
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

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-slate-500">eller</span>
          </div>
        </div>

        {/* Microsoft SSO Button */}
        <button
          type="button"
          onClick={() => window.location.href = '/api/auth/azure/login'}
          className="w-full flex justify-center items-center gap-3 px-4 py-3 bg-white border border-slate-300 text-slate-700 font-semibold rounded-md shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="9" height="9" fill="#f25022" />
            <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
            <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
          </svg>
          Log ind med Microsoft
        </button>

        <div className="mt-4 text-center">
          <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
            Glemt password?
          </Link>
        </div>
        <div className="mt-4 text-center text-sm text-slate-500">
          <p>
            Har du ikke en konto?{' '}
            <button onClick={onNavigateToRegister} className="text-blue-600 font-medium hover:underline">
              Registrer her
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

