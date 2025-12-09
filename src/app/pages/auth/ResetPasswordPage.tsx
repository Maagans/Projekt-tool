import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';

import { BrandLogo } from '../../../components/branding/BrandLogo';
import { api } from '../../../api';

export const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token') || '';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Ugyldigt eller manglende reset-token.');
        }
    }, [token]);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Adgangskoderne matcher ikke.');
            return;
        }

        if (password.length < 8) {
            setError('Adgangskoden skal være mindst 8 tegn.');
            return;
        }

        setIsSubmitting(true);

        const result = await api.resetPassword(token, password);

        if (result.success) {
            setSuccess(true);
        } else {
            setError(result.message || 'Der opstod en fejl.');
        }

        setIsSubmitting(false);
    };

    if (success) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-slate-200">
                    <div className="text-center mb-6 flex flex-col items-center">
                        <BrandLogo className="h-24 w-24 mb-4" />
                    </div>

                    <div className="text-center">
                        <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h2 className="text-xl font-semibold text-green-800 mb-2">Password nulstillet!</h2>
                            <p className="text-green-700">
                                Dit password er blevet ændret. Du kan nu logge ind med din nye adgangskode.
                            </p>
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="mt-4 px-6 py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700"
                        >
                            Gå til login
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-slate-200">
                <div className="text-center mb-8 flex flex-col items-center">
                    <BrandLogo className="h-24 w-24 mb-4" />
                    <h1 className="text-2xl font-bold text-slate-800">Nulstil password</h1>
                    <p className="text-slate-500 mt-2">Vælg en ny adgangskode til din konto.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Ny adgangskode</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Mindst 8 tegn"
                            required
                            minLength={8}
                            autoFocus
                            disabled={!token}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Bekræft adgangskode</label>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Gentag adgangskode"
                            required
                            minLength={8}
                            disabled={!token}
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">
                            {error}
                        </p>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={isSubmitting || !token}
                            className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait"
                        >
                            {isSubmitting ? 'Nulstiller...' : 'Nulstil password'}
                        </button>
                    </div>
                </form>

                <div className="mt-6 text-center">
                    <Link to="/login" className="text-blue-600 font-medium hover:underline">
                        ← Tilbage til login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPasswordPage;
