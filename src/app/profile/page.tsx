'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

interface Stats {
  wins: number;
  losses: number;
  ties: number;
  total: number;
}

interface GameHistory {
  id: string;
  player1: { id: string; username: string };
  player2: { id: string; username: string };
  rounds: Array<{ winner: string | null; roundNumber: number }>;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [history, setHistory] = useState<GameHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  useEffect(() => {
    if (!session) return;
    fetch(`/api/game?historyFor=${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats);
        setHistory(data.rooms || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [session]);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const winRate = stats && stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => router.push('/')}
          className="text-gray-400 hover:text-white text-sm mb-6 flex items-center gap-1 transition-colors"
        >
          ← Back to Lobby
        </button>

        {/* Profile Header */}
        <div className="glass rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-indigo-500/25">
              {session.user.username.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{session.user.username}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 capitalize">
                  {session.user.role.replace('_', ' ')}
                </span>
                <span className="text-gray-500 text-sm">Member</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-green-400">{stats.wins}</div>
              <div className="text-sm text-gray-400 mt-1">Wins</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-red-400">{stats.losses}</div>
              <div className="text-sm text-gray-400 mt-1">Losses</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-yellow-400">{stats.ties}</div>
              <div className="text-sm text-gray-400 mt-1">Ties</div>
            </div>
            <div className="glass rounded-2xl p-4 text-center">
              <div className="text-3xl font-bold text-indigo-400">{winRate}%</div>
              <div className="text-sm text-gray-400 mt-1">Win Rate</div>
            </div>
          </div>
        )}

        {/* Win rate bar */}
        {stats && stats.total > 0 && (
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Win Rate</span>
              <span className="font-medium">{stats.total} games played</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-700"
                style={{ width: `${winRate}%` }}
              />
            </div>
          </div>
        )}

        {/* Match History */}
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-semibold">Match History</h2>
          </div>
          {history.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <div className="text-4xl mb-3">🎮</div>
              <p>No games played yet. Head to the lobby to challenge someone!</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {history.map((game) => {
                const isP1 = game.player1.id === session.user.id;
                const opponent = isP1 ? game.player2 : game.player1;
                const lastRound = game.rounds[game.rounds.length - 1];
                const myResult = lastRound?.winner === 'tie'
                  ? 'tie'
                  : (isP1 && lastRound?.winner === 'p1') || (!isP1 && lastRound?.winner === 'p2')
                  ? 'win'
                  : 'loss';

                const resultColors = {
                  win: 'text-green-400 bg-green-500/10 border-green-500/20',
                  loss: 'text-red-400 bg-red-500/10 border-red-500/20',
                  tie: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
                };

                return (
                  <div key={game.id} className="p-4 flex items-center justify-between hover:bg-white/3 transition-colors">
                    <div>
                      <div className="font-medium">vs {opponent.username}</div>
                      <div className="text-sm text-gray-400 mt-0.5">
                        {game.rounds.length} round{game.rounds.length !== 1 ? 's' : ''} •{' '}
                        {new Date(game.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${resultColors[myResult]}`}>
                      {myResult}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
