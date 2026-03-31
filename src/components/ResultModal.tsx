'use client';

interface RoundResult {
  winner: 'p1' | 'p2' | 'tie';
  p1Guess: number;
  p2Guess: number;
  p1Secret: number;
  p2Secret: number;
  roundNumber: number;
}

interface Props {
  result: RoundResult;
  isP1: boolean;
  myUsername: string;
  opponentUsername: string;
  wantsPlayAgain: boolean;
  opponentWantsPlayAgain: boolean;
  onPlayAgain: () => void;
  onLeave: () => void;
}

export default function ResultModal({
  result,
  isP1,
  myUsername,
  opponentUsername,
  wantsPlayAgain,
  opponentWantsPlayAgain,
  onPlayAgain,
  onLeave,
}: Props) {
  const iWon = (isP1 && result.winner === 'p1') || (!isP1 && result.winner === 'p2');
  const isTie = result.winner === 'tie';

  const myGuess = isP1 ? result.p1Guess : result.p2Guess;
  const opponentGuess = isP1 ? result.p2Guess : result.p1Guess;
  const mySecret = isP1 ? result.p1Secret : result.p2Secret;
  const opponentSecret = isP1 ? result.p2Secret : result.p1Secret;

  const emoji = isTie ? '🤝' : iWon ? '🏆' : '💀';
  const title = isTie ? "It's a Tie!" : iWon ? 'You Win!' : 'You Lose!';
  const subtitle = isTie
    ? 'Both players guessed correctly at the same time!'
    : iWon
    ? 'You guessed their secret number!'
    : `${opponentUsername} guessed your secret number!`;

  const titleColor = isTie
    ? 'text-yellow-400'
    : iWon
    ? 'text-green-400'
    : 'text-red-400';

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-sm text-center animate-slide-up shadow-2xl">
        {/* Result icon */}
        <div className="text-7xl mb-3 animate-bounce-slow">{emoji}</div>

        <h2 className={`text-3xl font-bold mb-2 ${titleColor}`}>{title}</h2>
        <p className="text-gray-400 text-sm mb-6">{subtitle}</p>

        {/* Number reveals */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Your secret was</div>
            <div className="text-2xl font-bold text-indigo-300">{mySecret}</div>
            <div className="text-xs text-gray-400 mt-1">
              They guessed: <span className={opponentGuess === mySecret ? 'text-green-400' : 'text-red-400'}>{opponentGuess}</span>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/10">
            <div className="text-xs text-gray-500 mb-1">Their secret was</div>
            <div className="text-2xl font-bold text-purple-300">{opponentSecret}</div>
            <div className="text-xs text-gray-400 mt-1">
              You guessed: <span className={myGuess === opponentSecret ? 'text-green-400' : 'text-red-400'}>{myGuess}</span>
            </div>
          </div>
        </div>

        <div className="text-xs text-gray-500 mb-6">Round {result.roundNumber}</div>

        {/* Play again status */}
        {opponentWantsPlayAgain && !wantsPlayAgain && (
          <div className="text-sm text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-3 py-2 mb-4 animate-pulse">
            ⚡ Opponent wants a rematch!
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={onPlayAgain}
            disabled={wantsPlayAgain}
            className={`w-full py-3 rounded-xl font-semibold transition-all ${
              wantsPlayAgain
                ? 'bg-gray-700 text-gray-400 cursor-wait'
                : opponentWantsPlayAgain
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 shadow-lg shadow-green-500/25 animate-pulse'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 shadow-lg shadow-indigo-500/25'
            } hover:-translate-y-0.5 active:translate-y-0`}
          >
            {wantsPlayAgain
              ? '⏳ Waiting for opponent...'
              : opponentWantsPlayAgain
              ? '🎮 Accept Rematch!'
              : '🔁 Play Again'}
          </button>
          <button
            onClick={onLeave}
            className="w-full py-3 rounded-xl border border-gray-700 hover:bg-white/5 transition-colors text-gray-400 hover:text-white"
          >
            Leave Game
          </button>
        </div>
      </div>
    </div>
  );
}
