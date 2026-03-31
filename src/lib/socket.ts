import { Server as SocketIOServer, Socket } from 'socket.io';
import { getToken } from 'next-auth/jwt';
import prisma from './prisma';

// Map of userId -> socketId for tracking online players
const onlineUsers = new Map<string, string>();
// Map of socketId -> userId
const socketUserMap = new Map<string, string>();

export function setupSocketHandlers(io: SocketIOServer) {
  io.use(async (socket, next) => {
    // Authenticate socket connection via cookie/token
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) {
      // Allow connection but user won't be identified
      return next();
    }
    try {
      // Store token for later use
      (socket as any).userToken = token;
      next();
    } catch {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Player comes online
    socket.on('player:identify', async (data: { userId: string; username: string }) => {
      const { userId, username } = data;

      // Track the user
      onlineUsers.set(userId, socket.id);
      socketUserMap.set(socket.id, userId);

      // Update DB status
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { status: 'online', lastSeen: new Date() },
        });
      } catch (e) {
        console.error('Failed to update user status:', e);
      }

      // Broadcast to all clients that this user is online
      socket.broadcast.emit('player:online', { userId, username });

      // Send current online users list to this socket
      const onlineUserIds = Array.from(onlineUsers.keys());
      const users = await prisma.user.findMany({
        where: { id: { in: onlineUserIds } },
        select: { id: true, username: true, role: true, status: true, lastSeen: true },
      });
      socket.emit('players:list', users);

      console.log(`User identified: ${username} (${userId})`);
    });

    // Challenge: send challenge from one player to another
    socket.on('challenge:send', async (data: { fromId: string; fromUsername: string; toId: string }) => {
      const { fromId, fromUsername, toId } = data;

      // Mark both as challenge_pending in DB
      await prisma.user.updateMany({
        where: { id: { in: [fromId, toId] } },
        data: { status: 'challenge_pending' },
      });

      const toSocketId = onlineUsers.get(toId);
      if (toSocketId) {
        io.to(toSocketId).emit('challenge:receive', { fromId, fromUsername, toId });
      }

      // Notify all about status changes
      io.emit('player:statusChange', { userId: fromId, status: 'challenge_pending' });
      io.emit('player:statusChange', { userId: toId, status: 'challenge_pending' });
    });

    // Challenge accepted: create game room
    socket.on('challenge:accept', async (data: { fromId: string; toId: string }) => {
      const { fromId, toId } = data;

      // Create game room
      const room = await prisma.gameRoom.create({
        data: {
          player1Id: fromId,
          player2Id: toId,
          status: 'active',
        },
        include: {
          player1: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
          player2: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
        },
      });

      // Create first round
      await prisma.gameRound.create({
        data: {
          roomId: room.id,
          roundNumber: 1,
        },
      });

      // Mark both players as in_game
      await prisma.user.updateMany({
        where: { id: { in: [fromId, toId] } },
        data: { status: 'in_game' },
      });

      // Join both sockets to a room
      const fromSocketId = onlineUsers.get(fromId);
      const toSocketId = onlineUsers.get(toId);

      if (fromSocketId) {
        const fromSocket = io.sockets.sockets.get(fromSocketId);
        fromSocket?.join(room.id);
      }
      if (toSocketId) {
        const toSocket = io.sockets.sockets.get(toSocketId);
        toSocket?.join(room.id);
      }

      // Notify both players game is starting
      io.to(room.id).emit('game:start', {
        roomId: room.id,
        player1: room.player1,
        player2: room.player2,
      });

      // Notify lobby
      io.emit('player:statusChange', { userId: fromId, status: 'in_game' });
      io.emit('player:statusChange', { userId: toId, status: 'in_game' });

      console.log(`Game started: room ${room.id}, P1: ${fromId}, P2: ${toId}`);
    });

    // Challenge rejected
    socket.on('challenge:reject', async (data: { fromId: string; toId: string }) => {
      const { fromId, toId } = data;

      // Reset statuses
      await prisma.user.updateMany({
        where: { id: { in: [fromId, toId] } },
        data: { status: 'online' },
      });

      const fromSocketId = onlineUsers.get(fromId);
      if (fromSocketId) {
        io.to(fromSocketId).emit('challenge:rejected', { toId });
      }

      io.emit('player:statusChange', { userId: fromId, status: 'online' });
      io.emit('player:statusChange', { userId: toId, status: 'online' });
    });

    // Player locks in their secret number
    socket.on('game:lockSecret', async (data: { roomId: string; playerId: string; secret: number; isP1: boolean }) => {
      const { roomId, playerId, secret, isP1 } = data;

      if (secret < 1 || secret > 100) {
        socket.emit('game:error', { message: 'Secret must be between 1 and 100' });
        return;
      }

      // Find current round
      const round = await prisma.gameRound.findFirst({
        where: { roomId, winner: null },
        orderBy: { roundNumber: 'desc' },
      });

      if (!round) {
        socket.emit('game:error', { message: 'No active round found' });
        return;
      }

      // Update the secret (never send to opponent)
      if (isP1) {
        if (round.p1Secret !== null) {
          socket.emit('game:error', { message: 'Secret already locked' });
          return;
        }
        await prisma.gameRound.update({
          where: { id: round.id },
          data: { p1Secret: secret },
        });
      } else {
        if (round.p2Secret !== null) {
          socket.emit('game:error', { message: 'Secret already locked' });
          return;
        }
        await prisma.gameRound.update({
          where: { id: round.id },
          data: { p2Secret: secret },
        });
      }

      // Notify this player their secret is locked
      socket.emit('game:secretLocked', { roomId, playerId, roundId: round.id });

      // Notify opponent that the other player locked in (but not the value!)
      socket.to(roomId).emit('game:opponentSecretLocked', { roomId, playerId });

      // Check if both secrets are locked
      const updatedRound = await prisma.gameRound.findUnique({ where: { id: round.id } });
      if (updatedRound?.p1Secret !== null && updatedRound?.p2Secret !== null) {
        io.to(roomId).emit('game:bothLocked', { roomId, roundId: round.id });
      }
    });

    // Player makes a guess
    socket.on('game:guess', async (data: { roomId: string; roundId: string; playerId: string; guess: number; isP1: boolean }) => {
      const { roomId, roundId, playerId, guess, isP1 } = data;

      if (guess < 1 || guess > 100) {
        socket.emit('game:error', { message: 'Guess must be between 1 and 100' });
        return;
      }

      const round = await prisma.gameRound.findUnique({ where: { id: roundId } });
      if (!round) {
        socket.emit('game:error', { message: 'Round not found' });
        return;
      }

      // Validate both secrets exist
      if (round.p1Secret === null || round.p2Secret === null) {
        socket.emit('game:error', { message: 'Both players must lock secrets first' });
        return;
      }

      let hint: 'correct' | 'higher' | 'lower';
      let p1Guess = round.p1Guess;
      let p2Guess = round.p2Guess;

      if (isP1) {
        if (round.p1Guess !== null) {
          socket.emit('game:error', { message: 'You already guessed this round' });
          return;
        }
        // P1 is guessing P2's secret
        const target = round.p2Secret;
        if (guess === target) hint = 'correct';
        else if (guess < target) hint = 'higher';
        else hint = 'lower';

        await prisma.gameRound.update({ where: { id: roundId }, data: { p1Guess: guess } });
        p1Guess = guess;
      } else {
        if (round.p2Guess !== null) {
          socket.emit('game:error', { message: 'You already guessed this round' });
          return;
        }
        // P2 is guessing P1's secret
        const target = round.p1Secret;
        if (guess === target) hint = 'correct';
        else if (guess < target) hint = 'higher';
        else hint = 'lower';

        await prisma.gameRound.update({ where: { id: roundId }, data: { p2Guess: guess } });
        p2Guess = guess;
      }

      // Send hint only to the guesser
      socket.emit('game:guessResult', { roomId, roundId, playerId, guess, hint });
      // Notify opponent that guess was made (no value shown)
      socket.to(roomId).emit('game:opponentGuessed', { roomId, roundId, playerId });

      // Check if both have guessed this round
      if (p1Guess !== null && p2Guess !== null) {
        const p1Correct = p1Guess === round.p2Secret;
        const p2Correct = p2Guess === round.p1Secret;

        let winner: string | null = null;
        if (p1Correct && p2Correct) winner = 'tie';
        else if (p1Correct) winner = 'p1';
        else if (p2Correct) winner = 'p2';

        if (winner) {
          // Round complete — someone won or tied
          await prisma.gameRound.update({ where: { id: roundId }, data: { winner } });

          // Mark room finished if someone won outright
          if (winner !== 'tie' || true) {
            await prisma.gameRoom.update({ where: { id: roomId }, data: { status: 'finished' } });

            // Reset player statuses
            const room = await prisma.gameRoom.findUnique({ where: { id: roomId } });
            if (room) {
              await prisma.user.updateMany({
                where: { id: { in: [room.player1Id, room.player2Id] } },
                data: { status: 'online' },
              });
              io.emit('player:statusChange', { userId: room.player1Id, status: 'online' });
              io.emit('player:statusChange', { userId: room.player2Id, status: 'online' });
            }
          }

          io.to(roomId).emit('game:roundResult', {
            roomId,
            roundNumber: round.roundNumber,
            winner,
            p1Guess,
            p2Guess,
            p1Secret: round.p1Secret,
            p2Secret: round.p2Secret,
          });
        }
        // If neither guessed correctly, next round starts
        else {
          const nextRound = await prisma.gameRound.create({
            data: {
              roomId,
              roundNumber: round.roundNumber + 1,
            },
          });
          io.to(roomId).emit('game:nextRound', {
            roomId,
            roundId: nextRound.id,
            roundNumber: nextRound.roundNumber,
          });
        }
      }
    });

    // Play again
    socket.on('game:playAgain', async (data: { roomId: string; playerId: string }) => {
      const { roomId, playerId } = data;
      socket.to(roomId).emit('game:opponentWantsPlayAgain', { playerId });
    });

    socket.on('game:playAgainAccepted', async (data: { roomId: string; player1Id: string; player2Id: string }) => {
      const { roomId, player1Id, player2Id } = data;

      // Create new room
      const newRoom = await prisma.gameRoom.create({
        data: { player1Id, player2Id, status: 'active' },
        include: {
          player1: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
          player2: { select: { id: true, username: true, role: true, status: true, lastSeen: true } },
        },
      });

      await prisma.gameRound.create({
        data: { roomId: newRoom.id, roundNumber: 1 },
      });

      await prisma.user.updateMany({
        where: { id: { in: [player1Id, player2Id] } },
        data: { status: 'in_game' },
      });

      // Move sockets to new room
      const p1Socket = io.sockets.sockets.get(onlineUsers.get(player1Id) || '');
      const p2Socket = io.sockets.sockets.get(onlineUsers.get(player2Id) || '');
      p1Socket?.leave(roomId);
      p2Socket?.leave(roomId);
      p1Socket?.join(newRoom.id);
      p2Socket?.join(newRoom.id);

      io.to(newRoom.id).emit('game:start', {
        roomId: newRoom.id,
        player1: newRoom.player1,
        player2: newRoom.player2,
      });
    });

    // Leave game early
    socket.on('game:leave', async (data: { roomId: string; playerId: string }) => {
      const { roomId, playerId } = data;

      try {
        const room = await prisma.gameRoom.findUnique({ where: { id: roomId } });
        if (room && room.status === 'active') {
          await prisma.gameRoom.update({ where: { id: roomId }, data: { status: 'finished' } });
          await prisma.user.updateMany({
            where: { id: { in: [room.player1Id, room.player2Id] } },
            data: { status: 'online' },
          });
          socket.to(roomId).emit('game:opponentLeft', { playerId });
          io.emit('player:statusChange', { userId: room.player1Id, status: 'online' });
          io.emit('player:statusChange', { userId: room.player2Id, status: 'online' });
        }
      } catch (e) {
        console.error('Error leaving game:', e);
      }
      socket.leave(roomId);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      const userId = socketUserMap.get(socket.id);
      if (userId) {
        onlineUsers.delete(userId);
        socketUserMap.delete(socket.id);

        try {
          // Check if user was in a game
          const user = await prisma.user.findUnique({ where: { id: userId } });
          if (user?.status === 'in_game') {
            // Find their active room and forfeit
            const room = await prisma.gameRoom.findFirst({
              where: {
                status: 'active',
                OR: [{ player1Id: userId }, { player2Id: userId }],
              },
            });
            if (room) {
              await prisma.gameRoom.update({ where: { id: room.id }, data: { status: 'finished' } });
              const otherId = room.player1Id === userId ? room.player2Id : room.player1Id;
              await prisma.user.update({ where: { id: otherId }, data: { status: 'online' } });
              io.to(room.id).emit('game:opponentLeft', { playerId: userId });
              io.emit('player:statusChange', { userId: otherId, status: 'online' });
            }
          }

          await prisma.user.update({
            where: { id: userId },
            data: { status: 'offline', lastSeen: new Date() },
          });
        } catch (e) {
          console.error('Error on disconnect cleanup:', e);
        }

        io.emit('player:offline', { userId });
        console.log(`User disconnected: ${userId}`);
      }
    });
  });
}
