import { useState } from 'react';

type RegistrationPageProps = {
  onRegister: (email: string, name: string, password: string) => Promise<{ success: boolean; message: string }>;
  onNavigateToLogin: () => void;
};

export const RegistrationPage = ({ onRegister, onNavigateToLogin }: RegistrationPageProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setIsRegistering(true);
    const result = await onRegister(email, name, password);
    if (result.success) {
      setSuccess(result.message);
    } else {
      setError(result.message || 'Registrering fejlede.');
    }
    setIsRegistering(false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Kom i gang</h1>
          <p className="text-slate-500">Opret en konto for at få adgang til projektværktøjet</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fulde navn</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
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
          {success && <p className="text-sm text-green-600 bg-green-50 p-3 rounded-md border border-green-200">{success}</p>}
          <div>
            <button
              type="submit"
              disabled={isRegistering || !!success}
              className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait"
            >
              {isRegistering ? 'Registrerer...' : 'Opret konto'}
            </button>
          </div>
        </form>
        <div className="mt-6 text-center text-sm text-slate-500">
          <p>
            Har du allerede en konto?{' '}
            <button onClick={onNavigateToLogin} className="font-semibold text-blue-600 hover:underline">
              Log ind her
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegistrationPage;

