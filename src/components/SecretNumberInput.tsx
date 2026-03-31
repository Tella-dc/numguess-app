'use client';

import { useState } from 'react';

interface Props {
  onLock: (secret: number) => void;
  locked: boolean;
}

export default function SecretNumberInput({ onLock, locked }: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(value, 10);
    if (isNaN(num) || num < 1 || num > 100) {
      setError('Please enter a number between 1 and 100');
      return;
    }
    setError('');
    onLock(num);
  };

  if (locked) {
    return (
      <div className="text-center py-8">
        <div className="text-5xl mb-3">🔒</div>
        <p className="text-green-400 font-semibold text-lg">Secret number locked in!</p>
        <p className="text-gray-400 text-sm mt-1">Waiting for your opponent...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <h3 className="text-lg font-semibold mb-1 text-center">Pick Your Secret Number</h3>
      <p className="text-gray-400 text-sm text-center mb-5">
        Choose a number between 1 and 100. Your opponent will try to guess it!
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="number"
            min={1}
            max={100}
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder="Enter 1–100"
            className="w-full text-center text-3xl font-bold px-6 py-4 rounded-xl bg-gray-800/60 border border-gray-700 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all tracking-widest"
            autoFocus
          />
          {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0"
        >
          🔒 Lock In Secret
        </button>
      </form>
    </div>
  );
}
