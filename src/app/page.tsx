'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useSocket } from '@/lib/socketClient';
import PlayerCard from '@/components/PlayerCard';
import ChallengeModal from '@/components/ChallengeModal';
import type { PublicUser, ChallengePayload, GameStartPayload } from '@/types';

export default function LobbyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { emit, on, off, isConnected } = useSocket();

  const [players, setPlayers] = useState<PublicUser[]>([]);
  const [incomingChallenge, setIncomingChallenge] = useState<ChallengePayload | null>(null);
  const [pendingChallengeTo, setPendingChallengeTo] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Handle socket events
  useEffect(() => {
    if (!session) return;

    const offPlayersList = on('players:list', (list: PublicUser[]) => {
      setPlayers(list.filter((p) => p.id !== session.user.id));
    });

    const offPlayerOnline = on('player:online', (data: { userId: string; username: string }) => {
      setPlayers((prev) => {
        if (prev.find((p) => p.id === data.userId)) return prev;
        return [
          ...prev,
          { id: data.userId, username: data.username, role: 'user', status: 'online', lastSeen: new Date().toISOString() },
        ];
      });
      toast(`${data.username} is now online`, { icon: '🟢' });
    });

    const offPlayerOffline = on('player:offline', (data: { userId: string }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== data.userId));
    });

    const offStatusChange = on('player:statusChange', (data: { userId: string; status: string }) => {
      setPlayers((prev) =>
        prev.map((p) =>
          p.id === data.userId ? { ...p, status: data.status as PublicUser['status'] } : p
        )
      );
    });

    const offChallengeReceive = on('challenge:receive', (data: ChallengePayload) => {
      setIncomingChallenge(data);
      toast(`${data.fromUsername} challenged you!`, { icon: '⚔️', duration: 8000 });
    });

    const offChallengeRejected = on('challenge:rejected', () => {
      setPendingChallengeTo(null);
      toast.error('Challenge was rejected');
    });

    const offGameStart = on('game:start', (data: GameStartPayload) => {
      setPendingChallengeTo(null);
      setIncomingChallenge(null);
      toast.success('Game starting!');
      router.push(`/game/${data.roomId}`);
    });

    return () => {
      offPlayersList();
      offPlayerOnline();
      offPlayerOffline();
      offStatusChange();
      offChallengeReceive();
      offChallengeRejected();
      offGameStart();
    };
  }, [session, on, router]);

  const sendChallenge = useCallback((toPlayer: PublicUser) => {
    if (!session) return;
    setPendingChallengeTo(toPlayer.id);
    emit('challenge:send', {
      fromId: session.user.id,
      fromUsername: session.user.username,
      toId: toPlayer.id,
    });
    toast(`Challenge sent to ${toPlayer.username}!`, { icon: '⚔️' });
  }, [session, emit]);

  const acceptChallenge = useCallback(() => {
    if (!incomingChallenge || !session) return;
    emit('challenge:accept', {
      fromId: incomingChallenge.fromId,
      toId: session.user.id,
    });
    setIncomingChallenge(null);
  }, [incomingChallenge, session, emit]);

  const rejectChallenge = useCallback(() => {
    if (!incomingChallenge || !session) return;
    emit('challenge:reject', {
      fromId: incomingChallenge.fromId,
      toId: session.user.id,
    });
    setIncomingChallenge(null);
    toast('Challenge rejected');
  }, [incomingChallenge, session, emit]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return null;

  const onlinePlayers = players.filter((p) => p.status !== 'offline');

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600 rounded-full opacity-5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600 rounded-full opacity-5 blur-3xl" />
      </div>

      {/* Header */}
      <header className="max-w-4xl mx-auto flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold gradient-text">🎯 NumGuess</h1>
          <div className="flex items-center gap-2 mt-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Connected' : 'Reconnecting...'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-medium">{session.user.username}</div>
            <div className="text-xs text-gray-400 capitalize">{session.user.role.replace('_', ' ')}</div>
          </div>

          <div className="flex gap-2">
            {(session.user.role === 'admin' || session.user.role === 'super_admin') && (
              <button
                onClick={() => router.push('/admin')}
                className="px-3 py-1.5 text-xs font-medium glass rounded-lg hover:bg-white/10 transition-colors"
              >
                Admin
              </button>
            )}
            <button
              onClick={() => router.push('/profile')}
              className="px-3 py-1.5 text-xs font-medium glass rounded-lg hover:bg-white/10 transition-colors"
            >
              Profile
            </button>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="px-3 py-1.5 text-xs font-medium bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors text-red-400"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <div className="max-w-4xl mx-auto">
        {/* Stats bar */}
        <div className="glass rounded-2xl p-4 mb-6 flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{onlinePlayers.length}</div>
            <div className="text-xs text-gray-400">Online Players</div>
          </div>
          <div className="h-8 w-px bg-white/10" />
          <div className="text-sm text-gray-300">
            Challenge someone to a duel! Pick a secret number, they pick theirs — then take turns guessing each other&apos;s number. First to guess correctly wins!
          </div>
        </div>

        {/* Players grid */}
        {onlinePlayers.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">😴</div>
            <h3 className="text-xl font-medium text-gray-300">No other players online</h3>
            <p className="text-gray-500 mt-2 text-sm">Share the link with friends to play!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {onlinePlayers.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                currentUserId={session.user.id}
                pendingChallengeTo={pendingChallengeTo}
                onChallenge={sendChallenge}
              />
            ))}
          </div>
        )}
      </div>

      {/* Challenge Modal */}
      {incomingChallenge && (
        <ChallengeModal
          challenge={incomingChallenge}
          onAccept={acceptChallenge}
          onReject={rejectChallenge}
        />
      )}
    </main>
  );
}
