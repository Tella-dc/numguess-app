'use client';

import type { PublicUser } from '@/types';

interface Props {
  player: PublicUser;
  currentUserId: string;
  pendingChallengeTo: string | null;
  onChallenge: (player: PublicUser) => void;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  online: { label: 'Available', color: 'text-green-400', dot: 'bg-green-400' },
  in_game: { label: 'In Game', color: 'text-red-400', dot: 'bg-red-400' },
  challenge_pending: { label: 'In Challenge', color: 'text-yellow-400', dot: 'bg-yellow-400 animate-pulse' },
  offline: { label: 'Offline', color: 'text-gray-500', dot: 'bg-gray-500' },
};

export default function PlayerCard({ player, currentUserId, pendingChallengeTo, onChallenge }: Props) {
  const config = statusConfig[player.status] || statusConfig.offline;
  const isAvailable = player.status === 'online';
  const isPendingWithThis = pendingChallengeTo === player.id;
  const isPendingWithOther = pendingChallengeTo !== null && pendingChallengeTo !== player.id;

  const roleEmoji: Record<string, string> = {
    super_admin: '👑',
    admin: '🛡️',
    user: '🎮',
  };

  return (
    <div className={`glass rounded-2xl p-5 flex flex-col gap-4 transition-all duration-200 hover:bg-white/8 animate-fade-in ${isPendingWithThis ? 'ring-1 ring-yellow-500/50' : ''}`}>
      {/* Avatar + Name */}
      <div className="flex items-start gap-3">
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/30 to-purple-500/30 border border-white/10 flex items-center justify-center text-lg font-bold text-white">
            {player.username.charAt(0).toUpperCase()}
          </div>
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-gray-950 ${config.dot}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-white truncate">{player.username}</span>
            <span title={player.role}>{roleEmoji[player.role] || '🎮'}</span>
          </div>
          <div className={`text-xs font-medium mt-0.5 ${config.color}`}>
            {config.label}
          </div>
        </div>
      </div>

      {/* Challenge button */}
      <button
        onClick={() => onChallenge(player)}
        disabled={!isAvailable || isPendingWithOther || isPendingWithThis}
        className={`w-full py-2 px-4 rounded-xl text-sm font-semibold transition-all duration-200 ${
          isPendingWithThis
            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 cursor-wait'
            : isAvailable && !isPendingWithOther
            ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-0.5 active:translate-y-0'
            : 'bg-gray-800/50 text-gray-500 border border-gray-700/50 cursor-not-allowed'
        }`}
      >
        {isPendingWithThis
          ? '⏳ Challenge Sent...'
          : !isAvailable
          ? player.status === 'in_game' ? '🎮 In Game' : '⏳ Busy'
          : isPendingWithOther
          ? 'Challenge Pending'
          : '⚔️ Challenge'}
      </button>
    </div>
  );
}
