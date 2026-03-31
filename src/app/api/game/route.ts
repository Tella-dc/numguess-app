import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET /api/game?roomId=xxx - get game room state
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  const historyFor = searchParams.get('historyFor');

  // Return match history for a user
  if (historyFor) {
    const userId = historyFor;
    const rooms = await prisma.gameRoom.findMany({
      where: {
        status: 'finished',
        OR: [{ player1Id: userId }, { player2Id: userId }],
      },
      include: {
        player1: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
        player2: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
        rounds: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Compute stats
    let wins = 0, losses = 0, ties = 0;
    for (const room of rooms) {
      const isP1 = room.player1Id === userId;
      const lastRound = room.rounds[room.rounds.length - 1];
      if (!lastRound?.winner) continue;
      if (lastRound.winner === 'tie') ties++;
      else if ((isP1 && lastRound.winner === 'p1') || (!isP1 && lastRound.winner === 'p2')) wins++;
      else losses++;
    }

    return NextResponse.json({ rooms, stats: { wins, losses, ties, total: rooms.length } });
  }

  if (!roomId) return NextResponse.json({ error: 'roomId required' }, { status: 400 });

  const room = await prisma.gameRoom.findUnique({
    where: { id: roomId },
    include: {
      player1: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
      player2: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
      rounds: { orderBy: { roundNumber: 'asc' } },
    },
  });

  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });

  // Security: don't send opponent's secrets
  const userId = session.user.id;
  const isP1 = room.player1Id === userId;

  const sanitizedRounds = room.rounds.map((round) => ({
    ...round,
    // Only reveal your own secret and the opponent's secret after round ends
    p1Secret: isP1
      ? round.p1Secret
      : round.winner !== null
      ? round.p1Secret
      : null,
    p2Secret: !isP1
      ? round.p2Secret
      : round.winner !== null
      ? round.p2Secret
      : null,
  }));

  return NextResponse.json({ ...room, rounds: sanitizedRounds });
}
