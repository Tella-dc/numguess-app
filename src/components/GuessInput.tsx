'use client';

import { useEffect, useState } from 'react';

interface Props {
  onGuess: (guess: number) => void;
  disabled: boolean;
  lastGuess: number | null;
  lastHint: 'correct' | 'higher' | 'lower' | null;
  opponentGuessed: boolean;
  alreadyGuessed: boolean;
}

const hintConfig = {
  higher: { icon: '⬆️', text: 'Go Higher!', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30' },
  lower: { icon: '⬇️', text: 'Go Lower!', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30' },
  correct: { icon: '✅', text: 'Correct!', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/30' },
};

export default function GuessInput({ onGuess, disabled, lastGuess, lastHint, opponentGuessed, alreadyGuessed }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [hintFading, setHintFading] = useState(false);

  useEffect(() => {
    if (!lastHint || lastGuess === null) return;

    setShowHint(true);
    setHintFading(false);

    const fadeTimeout = window.setTimeout(() => {
      setHintFading(true);
    }, 2600);

    const hideTimeout = window.setTimeout(() => {
      setShowHint(false);
    }, 3200);

    return () => {
      window.clearTimeout(fadeTimeout);
      window.clearTimeout(hideTimeout);
    };
  }, [lastHint, lastGuess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 100) {
      setError('Enter a number between 1 and 100');
      return;
    }
    setError('');
    setValue('');
    onGuess(num);
  };

  const hint = lastHint ? hintConfig[lastHint] : null;

  const shouldShowHint = showHint && hint && lastGuess !== null;

  return (
    <div className="animate-fade-in">
      <h3 className="text-lg font-semibold mb-1 text-center">Guess Their Number</h3>
      <p className="text-gray-400 text-sm text-center mb-4">
        What&apos;s your opponent&apos;s secret number? (1–100)
      </p>

      {/* Hint display */}
      {shouldShowHint && (
        <div
          className={`flex items-center gap-3 rounded-xl p-3 mb-4 border ${hint.bg} animate-fade-in transition-opacity duration-500 ${
            hintFading ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <span className="text-2xl">{hint.icon}</span>
          <div>
            <div className={`font-semibold ${hint.color}`}>{hint.text}</div>
            <div className="text-xs text-gray-400">Your guess was {lastGuess}</div>
          </div>
        </div>
      )}

      {/* Opponent status */}
      <div className={`text-xs text-center mb-4 py-1.5 px-3 rounded-full inline-block mx-auto flex justify-center ${opponentGuessed ? 'text-green-400 bg-green-500/10' : 'text-gray-500 bg-gray-800/50'}`}>
        {opponentGuessed ? '✓ Opponent has guessed' : '⏳ Opponent is guessing...'}
      </div>

      {alreadyGuessed ? (
        <div className="text-center py-4">
          <p className="text-indigo-400 font-medium">You&apos;ve made your guess — waiting for results!</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="number"
            min={1}
            max={100}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="1–100"
            disabled={disabled}
            className="w-full text-center text-3xl font-bold px-6 py-4 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            type="submit"
            disabled={disabled}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-all shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 active:translate-y-0"
          >
            🎯 Submit Guess
          </button>
        </form>
      )}
    </div>
  );
}
