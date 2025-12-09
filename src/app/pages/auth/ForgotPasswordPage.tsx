import { useState } from 'react';
import { Link } from 'react-router-dom';

import { BrandLogo } from '../../../components/branding/BrandLogo';
import { api } from '../../../api';

export const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [isAzureAdUser, setIsAzureAdUser] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setError('');
        setIsSubmitting(true);

        const result = await api.forgotPassword(email);

        if (result.success) {
            if (result.isAzureAdUser) {
                setIsAzureAdUser(true);
            }
            setSubmitted(true);
        } else {
            setError(result.message || 'Der opstod en fejl.');
        }

        setIsSubmitting(false);
    };

    if (submitted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-100">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl border border-slate-200">
                    <div className="text-center mb-6 flex flex-col items-center">
                        <BrandLogo className="h-24 w-24 mb-4" />
                    </div>

                    {isAzureAdUser ? (
                        <div className="text-center">
                            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                <h2 className="text-xl font-semibold text-blue-800 mb-2">Microsoft-login</h2>
                                <p className="text-blue-700 mb-4">
                                    Du bruger Microsoft til at logge ind. Nulstil dit password via Microsoft.
                                </p>
                                <a
                                    href="https://account.live.com/password/reset"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700"
                                >
                                    Nulstil via Microsoft →
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
                                <h2 className="text-xl font-semibold text-green-800 mb-2">Email sendt!</h2>
                                <p className="text-green-700">
                                    Hvis der findes en konto med denne email, har vi sendt dig instruktioner til at nulstille dit password.
                                </p>
                            </div>
                            <p className="text-sm text-slate-500 mt-4">
                                Tjek din indbakke (og evt. spam-mappe).
                            </p>
                        </div>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-blue-600 font-medium hover:underline">
                            ← Tilbage til login
                        </Link>
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
                    <h1 className="text-2xl font-bold text-slate-800">Glemt password?</h1>
                    <p className="text-slate-500 mt-2">
                        Indtast din email, så sender vi dig et link til at nulstille dit password.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="din@email.dk"
                            required
                            autoFocus
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
                            disabled={isSubmitting}
                            className="w-full flex justify-center items-center gap-2 px-4 py-3 bg-blue-600 text-white font-semibold rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait"
                        >
                            {isSubmitting ? 'Sender...' : 'Send reset-link'}
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

export default ForgotPasswordPage;
