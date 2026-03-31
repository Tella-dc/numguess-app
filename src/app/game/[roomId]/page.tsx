'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useSocket } from '@/lib/socketClient';
import GameRoom from '@/components/GameRoom';
import type { PublicUser } from '@/types';

interface GameState {
  roomId: string;
  player1: PublicUser;
  player2: PublicUser;
  roundId: string | null;
  roundNumber: number;
  mySecretLocked: boolean;
  opponentSecretLocked: boolean;
  bothLocked: boolean;
  iGuessed: boolean;
  opponentGuessed: boolean;
  myLastGuess: number | null;
  myLastHint: 'correct' | 'higher' | 'lower' | null;
  roundResult: {
    winner: 'p1' | 'p2' | 'tie';
    p1Guess: number;
    p2Guess: number;
    p1Secret: number;
    p2Secret: number;
    roundNumber: number;
  } | null;
  gameOver: boolean;
  myWins: number;
  opponentWins: number;
  ties: number;
}

export default function GamePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const roomId = params.roomId as string;
  const { emit, on } = useSocket();

  const [gameState, setGameState] = useState<GameState | null>(null);
  const [wantsPlayAgain, setWantsPlayAgain] = useState(false);
  const [opponentWantsPlayAgain, setOpponentWantsPlayAgain] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/login');
  }, [status, router]);

  // Fetch initial game state
  useEffect(() => {
    if (!session) return;
    fetch(`/api/game?roomId=${roomId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { router.push('/'); return; }
        const isP1 = data.player1Id === session.user.id;
        const currentRound = data.rounds[data.rounds.length - 1];
        const completedRounds = data.rounds.filter((round: any) => round.winner !== null);
        const myWins = completedRounds.filter((round: any) =>
          (isP1 && round.winner === 'p1') || (!isP1 && round.winner === 'p2')
        ).length;
        const opponentWins = completedRounds.filter((round: any) =>
          (isP1 && round.winner === 'p2') || (!isP1 && round.winner === 'p1')
        ).length;
        const ties = completedRounds.filter((round: any) => round.winner === 'tie').length;

        setGameState({
          roomId: data.id,
          player1: data.player1,
          player2: data.player2,
          roundId: currentRound?.id || null,
          roundNumber: currentRound?.roundNumber || 1,
          mySecretLocked: isP1 ? currentRound?.p1Secret !== null : currentRound?.p2Secret !== null,
          opponentSecretLocked: isP1 ? currentRound?.p2Secret !== null : currentRound?.p1Secret !== null,
          bothLocked: currentRound?.p1Secret !== null && currentRound?.p2Secret !== null,
          iGuessed: isP1 ? currentRound?.p1Guess !== null : currentRound?.p2Guess !== null,
          opponentGuessed: isP1 ? currentRound?.p2Guess !== null : currentRound?.p1Guess !== null,
          myLastGuess: null,
          myLastHint: null,
          roundResult: null,
          gameOver: data.status === 'finished',
          myWins,
          opponentWins,
          ties,
        });
      });
  }, [session, roomId, router]);

  // Socket events
  useEffect(() => {
    if (!session || !gameState) return;

    const offSecretLocked = on('game:secretLocked', ({ playerId }: { roomId: string; playerId: string }) => {
      if (playerId === session.user.id) {
        setGameState((prev) => prev ? { ...prev, mySecretLocked: true } : prev);
      }
    });

    const offOpponentSecretLocked = on('game:opponentSecretLocked', () => {
      setGameState((prev) => prev ? { ...prev, opponentSecretLocked: true } : prev);
      toast('Opponent locked their number!', { icon: '🔒' });
    });

    const offBothLocked = on('game:bothLocked', ({ roundId }: { roomId: string; roundId: string }) => {
      setGameState((prev) => prev ? { ...prev, bothLocked: true, roundId } : prev);
      toast.success('Both numbers locked! Start guessing!');
    });

    const offGuessResult = on('game:guessResult', (data: { guess: number; hint: 'correct' | 'higher' | 'lower' }) => {
      setGameState((prev) =>
        prev ? { ...prev, iGuessed: true, myLastGuess: data.guess, myLastHint: data.hint } : prev
      );
    });

    const offOpponentGuessed = on('game:opponentGuessed', () => {
      setGameState((prev) => prev ? { ...prev, opponentGuessed: true } : prev);
      toast('Opponent made a guess!', { icon: '🤔' });
    });

    const offRoundResult = on('game:roundResult', (data: any) => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              roundResult: data,
              gameOver: true,
              myWins:
                data.winner === 'tie'
                  ? prev.myWins
                  : (prev.player1.id === session.user.id && data.winner === 'p1') ||
                    (prev.player2.id === session.user.id && data.winner === 'p2')
                  ? prev.myWins + 1
                  : prev.myWins,
              opponentWins:
                data.winner === 'tie'
                  ? prev.opponentWins
                  : (prev.player1.id === session.user.id && data.winner === 'p2') ||
                    (prev.player2.id === session.user.id && data.winner === 'p1')
                  ? prev.opponentWins + 1
                  : prev.opponentWins,
              ties: data.winner === 'tie' ? prev.ties + 1 : prev.ties,
            }
          : prev
      );
    });

    const offContinueGuessing = on('game:continueGuessing', (data: { roundId: string; roundNumber: number }) => {
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              roundId: data.roundId,
              roundNumber: data.roundNumber,
              iGuessed: false,
              opponentGuessed: false,
            }
          : prev
      );
      toast('No one got it yet. Keep guessing!', { icon: '🎯' });
    });

    const offOpponentLeft = on('game:opponentLeft', () => {
      toast.error('Opponent disconnected from the game');
      setGameState((prev) => prev ? { ...prev, gameOver: true } : prev);
    });

    const offOpponentPlayAgain = on('game:opponentWantsPlayAgain', () => {
      setOpponentWantsPlayAgain(true);
      toast('Opponent wants to play again!', { icon: '🔁' });
    });

    const offRematchStarted = on('game:rematchStarted', (data: { roomId: string; roundId: string; roundNumber: number }) => {
      setWantsPlayAgain(false);
      setOpponentWantsPlayAgain(false);
      setGameState((prev) =>
        prev
          ? {
              ...prev,
              roomId: data.roomId,
              roundId: data.roundId,
              roundNumber: data.roundNumber,
              mySecretLocked: false,
              opponentSecretLocked: false,
              bothLocked: false,
              iGuessed: false,
              opponentGuessed: false,
              myLastGuess: null,
              myLastHint: null,
              roundResult: null,
              gameOver: false,
            }
          : prev
      );
      toast.success('Rematch started! Pick a new secret number.');
    });

    return () => {
      offSecretLocked();
      offOpponentSecretLocked();
      offBothLocked();
      offGuessResult();
      offOpponentGuessed();
      offRoundResult();
      offContinueGuessing();
      offOpponentLeft();
      offOpponentPlayAgain();
      offRematchStarted();
    };
  }, [session, gameState, on]);

  const lockSecret = useCallback((secret: number) => {
    if (!session || !gameState) return;
    const isP1 = gameState.player1.id === session.user.id;
    emit('game:lockSecret', {
      roomId: gameState.roomId,
      playerId: session.user.id,
      secret,
      isP1,
    });
  }, [session, gameState, emit]);

  const makeGuess = useCallback((guess: number) => {
    if (!session || !gameState || !gameState.roundId) return;
    const isP1 = gameState.player1.id === session.user.id;
    emit('game:guess', {
      roomId: gameState.roomId,
      roundId: gameState.roundId,
      playerId: session.user.id,
      guess,
      isP1,
    });
  }, [session, gameState, emit]);

  const handlePlayAgain = useCallback(() => {
    if (!session || !gameState) return;
    setWantsPlayAgain(true);

    if (opponentWantsPlayAgain) {
      // Both want to play again
      emit('game:playAgainAccepted', {
        roomId: gameState.roomId,
        player1Id: gameState.player1.id,
        player2Id: gameState.player2.id,
      });
    } else {
      emit('game:playAgain', { roomId: gameState.roomId, playerId: session.user.id });
      toast('Waiting for opponent...', { icon: '⏳' });
    }
  }, [session, gameState, opponentWantsPlayAgain, emit]);

  const handleLeave = useCallback(() => {
    if (!session || !gameState) return;
    emit('game:leave', { roomId: gameState.roomId, playerId: session.user.id });
    router.push('/');
  }, [session, gameState, emit, router]);

  if (status === 'loading' || !gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading game...</p>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const isP1 = gameState.player1.id === session.user.id;
  const me = isP1 ? gameState.player1 : gameState.player2;
  const opponent = isP1 ? gameState.player2 : gameState.player1;

  return (
    <GameRoom
      roomId={roomId}
      me={me}
      opponent={opponent}
      isP1={isP1}
      roundNumber={gameState.roundNumber}
      mySecretLocked={gameState.mySecretLocked}
      opponentSecretLocked={gameState.opponentSecretLocked}
      bothLocked={gameState.bothLocked}
      iGuessed={gameState.iGuessed}
      opponentGuessed={gameState.opponentGuessed}
      myLastGuess={gameState.myLastGuess}
      myLastHint={gameState.myLastHint}
      roundResult={gameState.roundResult}
      gameOver={gameState.gameOver}
      myWins={gameState.myWins}
      opponentWins={gameState.opponentWins}
      ties={gameState.ties}
      wantsPlayAgain={wantsPlayAgain}
      opponentWantsPlayAgain={opponentWantsPlayAgain}
      onLockSecret={lockSecret}
      onMakeGuess={makeGuess}
      onPlayAgain={handlePlayAgain}
      onLeave={handleLeave}
    />
  );
}
