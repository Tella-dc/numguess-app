'use client';

import SecretNumberInput from './SecretNumberInput';
import GuessInput from './GuessInput';
import ResultModal from './ResultModal';
import type { PublicUser } from '@/types';

interface RoundResult {
  winner: 'p1' | 'p2' | 'tie';
  p1Guess: number;
  p2Guess: number;
  p1Secret: number;
  p2Secret: number;
  roundNumber: number;
}

interface Props {
  roomId: string;
  me: PublicUser;
  opponent: PublicUser;
  isP1: boolean;
  roundNumber: number;
  mySecretLocked: boolean;
  opponentSecretLocked: boolean;
  bothLocked: boolean;
  iGuessed: boolean;
  opponentGuessed: boolean;
  myLastGuess: number | null;
  myLastHint: 'correct' | 'higher' | 'lower' | null;
  roundResult: RoundResult | null;
  gameOver: boolean;
  myWins: number;
  opponentWins: number;
  ties: number;
  wantsPlayAgain: boolean;
  opponentWantsPlayAgain: boolean;
  onLockSecret: (secret: number) => void;
  onMakeGuess: (guess: number) => void;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export default function GameRoom({
  roomId,
  me,
  opponent,
  isP1,
  roundNumber,
  mySecretLocked,
  opponentSecretLocked,
  bothLocked,
  iGuessed,
  opponentGuessed,
  myLastGuess,
  myLastHint,
  roundResult,
  gameOver,
  myWins,
  opponentWins,
  ties,
  wantsPlayAgain,
  opponentWantsPlayAgain,
  onLockSecret,
  onMakeGuess,
  onPlayAgain,
  onLeave,
}: Props) {
  // Determine game phase
  const phase = !bothLocked ? 'secret' : 'guess';

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600 rounded-full opacity-5 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600 rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold gradient-text">🎯 NumGuess</h1>
            <p className="text-xs text-gray-500 mt-0.5">Room #{roomId.slice(-6)}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center">
              <div className="text-lg font-bold text-indigo-400">{roundNumber}</div>
              <div className="text-xs text-gray-500">Round</div>
            </div>
            <button
              onClick={onLeave}
              className="px-3 py-1.5 text-xs text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              Leave
            </button>
          </div>
        </div>

        {/* Players header */}
        <div className="glass rounded-2xl p-4 mb-6">
          <div className="flex items-center justify-between">
            {/* Me */}
            <div className="text-center flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold mx-auto mb-1 shadow-lg shadow-indigo-500/25">
                {me.username.charAt(0).toUpperCase()}
              </div>
              <div className="font-semibold text-sm">{me.username}</div>
              <div className="text-xs text-gray-500">You</div>
            </div>

            {/* VS */}
            <div className="flex flex-col items-center px-4">
              <div className="text-2xl font-black text-gray-600">VS</div>
              {phase === 'secret' && (
                <div className="text-xs text-gray-500 mt-1">Locking secrets</div>
              )}
              {phase === 'guess' && (
                <div className="text-xs text-purple-400 mt-1 animate-pulse">Guessing!</div>
              )}
            </div>

            {/* Opponent */}
            <div className="text-center flex-1">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-red-600 flex items-center justify-center font-bold mx-auto mb-1 shadow-lg shadow-pink-500/25">
                {opponent.username.charAt(0).toUpperCase()}
              </div>
              <div className="font-semibold text-sm">{opponent.username}</div>
              <div className="text-xs text-gray-500">Opponent</div>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="flex gap-3 mb-6">
          <div className={`flex-1 h-1.5 rounded-full ${!bothLocked ? 'bg-indigo-500' : 'bg-indigo-500/20'}`} />
          <div className={`flex-1 h-1.5 rounded-full ${bothLocked ? 'bg-purple-500' : 'bg-purple-500/20'}`} />
        </div>

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">Your Wins</div>
            <div className="text-xl font-bold text-green-400">{myWins}</div>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">Ties</div>
            <div className="text-xl font-bold text-yellow-400">{ties}</div>
          </div>
          <div className="glass rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">{opponent.username} Wins</div>
            <div className="text-xl font-bold text-red-400">{opponentWins}</div>
          </div>
        </div>

        {/* Main game card */}
        <div className="glass rounded-2xl p-6 mb-4">
          {/* Secret phase */}
          {phase === 'secret' && (
            <div>
              <SecretNumberInput onLock={onLockSecret} locked={mySecretLocked} />

              {/* Opponent lock status */}
              {!opponentSecretLocked && !mySecretLocked && (
                <div className="mt-4 text-center text-sm text-gray-500">
                  Both players must lock a number before guessing begins
                </div>
              )}
              {mySecretLocked && !opponentSecretLocked && (
                <div className="mt-4 text-center text-sm text-gray-400">
                  <span className="animate-pulse">⏳</span> Waiting for {opponent.username} to lock their number...
                </div>
              )}
            </div>
          )}

          {/* Guess phase */}
          {phase === 'guess' && (
            <GuessInput
              onGuess={onMakeGuess}
              disabled={!bothLocked || iGuessed}
              lastGuess={myLastGuess}
              lastHint={myLastHint}
              opponentGuessed={opponentGuessed}
              alreadyGuessed={iGuessed}
            />
          )}
        </div>

        {/* Status bars */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`glass rounded-xl p-3 flex items-center gap-2 text-sm ${mySecretLocked ? 'border-green-500/30' : 'border-white/10'}`}>
            <span className="text-lg">{mySecretLocked ? '🔒' : '🔓'}</span>
            <div>
              <div className="font-medium text-xs text-gray-400">Your secret</div>
              <div className={mySecretLocked ? 'text-green-400 text-xs' : 'text-gray-500 text-xs'}>
                {mySecretLocked ? 'Locked' : 'Not set'}
              </div>
            </div>
          </div>
          <div className={`glass rounded-xl p-3 flex items-center gap-2 text-sm ${opponentSecretLocked ? 'border-green-500/30' : 'border-white/10'}`}>
            <span className="text-lg">{opponentSecretLocked ? '🔒' : '🔓'}</span>
            <div>
              <div className="font-medium text-xs text-gray-400">{opponent.username}&apos;s secret</div>
              <div className={opponentSecretLocked ? 'text-green-400 text-xs' : 'text-gray-500 text-xs'}>
                {opponentSecretLocked ? 'Locked' : 'Not set'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Result Modal */}
      {roundResult && (
        <ResultModal
          result={roundResult}
          isP1={isP1}
          myUsername={me.username}
          opponentUsername={opponent.username}
          myWins={myWins}
          opponentWins={opponentWins}
          ties={ties}
          wantsPlayAgain={wantsPlayAgain}
          opponentWantsPlayAgain={opponentWantsPlayAgain}
          onPlayAgain={onPlayAgain}
          onLeave={onLeave}
        />
      )}
    </main>
  );
}
