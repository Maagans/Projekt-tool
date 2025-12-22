
import type { User } from '../../../../types';

type DashboardHeroProps = {
    user: User | null;
    isSyncing: boolean;
};

export const DashboardHero = ({ user, isSyncing }: DashboardHeroProps) => {
    const userName = user?.name || 'Bruger';

    return (
        <div className="hero mb-10 relative p-8 bg-gradient-to-r from-teal-600 via-cyan-600 to-blue-600 rounded-2xl overflow-hidden shadow-lg">
            {/* Glow Effect */}
            <div className="absolute top-[-50%] right-[-10%] w-[400px] h-[400px] bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_70%)] pointer-events-none" />

            <div className="flex justify-between items-end relative z-10">
                <div>
                    <p className="text-teal-100 font-medium text-sm uppercase tracking-wide mb-2">
                        Velkommen
                    </p>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-none text-white">
                        {userName}
                    </h1>
                </div>

                <div className="text-right">
                    {isSyncing ? (
                        <div className="sync-badge inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm bg-amber-500/20 text-amber-100">
                            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                            Synkroniserer...
                        </div>
                    ) : (
                        <div className="sync-badge inline-flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-full backdrop-blur-sm bg-emerald-500/20 text-emerald-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                            Online
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
