'use client';

import type { ChallengePayload } from '@/types';

interface Props {
  challenge: ChallengePayload;
  onAccept: () => void;
  onReject: () => void;
}

export default function ChallengeModal({ challenge, onAccept, onReject }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-8 w-full max-w-sm text-center animate-slide-up shadow-2xl">
        {/* Sword animation */}
        <div className="text-6xl mb-4 animate-bounce-slow">⚔️</div>

        <h2 className="text-2xl font-bold mb-2">Challenge Received!</h2>
        <p className="text-gray-300 mb-1">
          <span className="font-semibold text-indigo-300">{challenge.fromUsername}</span> wants to duel!
        </p>
        <p className="text-gray-500 text-sm mb-8">
          Pick your secret number and take turns guessing each other&apos;s number.
        </p>

        {/* Game rules quick recap */}
        <div className="bg-white/5 rounded-xl p-3 mb-6 text-xs text-gray-400 text-left space-y-1">
          <div>🔢 Both players pick a secret number (1-100)</div>
          <div>🎯 Take turns guessing each other&apos;s number</div>
          <div>💡 Get higher/lower hints after each wrong guess</div>
          <div>🏆 First to guess correctly wins!</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onReject}
            className="flex-1 py-3 rounded-xl border border-gray-700 hover:bg-white/5 transition-colors font-medium text-gray-300"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-semibold transition-all shadow-lg shadow-indigo-500/25 hover:-translate-y-0.5"
          >
            Accept! 🎮
          </button>
        </div>
      </div>
    </div>
  );
}
