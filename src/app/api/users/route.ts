import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/users - list all users (admin+)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (session.user.role !== 'admin' && session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    select: { id: true, username: true, role: true, status: true, lastSeen: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(users);
}

// POST /api/users - create user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { username, password, targetRole } = body;

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
  }

  // Admins can only create users; super_admin can create users or admins
  if (targetRole === 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can create admins' }, { status: 403 });
  }
  if (targetRole === 'super_admin') {
    return NextResponse.json({ error: 'Cannot create super_admin' }, { status: 403 });
  }

  const existingUser = await prisma.user.findUnique({ where: { username } });
  if (existingUser) {
    return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const newUser = await prisma.user.create({
    data: {
      username,
      passwordHash,
      role: targetRole || 'user',
    },
    select: { id: true, username: true, role: true, status: true, createdAt: true },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'CREATE_USER',
      targetId: newUser.id,
      details: `Created user "${username}" with role "${newUser.role}"`,
    },
  });

  return NextResponse.json(newUser, { status: 201 });
}

// DELETE /api/users?id=xxx - delete user (super_admin or admin for users)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = session.user.role;
  if (role !== 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const targetId = searchParams.get('id');

  if (!targetId) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // Cannot delete self
  if (target.id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  // Admin can only delete users, super_admin can delete users and admins
  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot delete super_admin' }, { status: 403 });
  }
  if (target.role === 'admin' && role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can delete admins' }, { status: 403 });
  }

  // Delete user (cascade delete audit logs to avoid FK errors)
  await prisma.auditLog.deleteMany({ where: { OR: [{ actorId: targetId }, { targetId }] } });
  await prisma.user.delete({ where: { id: targetId } });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'DELETE_USER',
      details: `Deleted user "${target.username}" (role: ${target.role})`,
    },
  });

  return NextResponse.json({ success: true });
}

// PATCH /api/users - promote/demote user
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (session.user.role !== 'super_admin') {
    return NextResponse.json({ error: 'Only super_admin can change roles' }, { status: 403 });
  }

  const body = await req.json();
  const { targetId, newRole } = body;

  if (!targetId || !newRole) {
    return NextResponse.json({ error: 'targetId and newRole required' }, { status: 400 });
  }

  if (!['admin', 'user'].includes(newRole)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (target.role === 'super_admin') {
    return NextResponse.json({ error: 'Cannot change super_admin role' }, { status: 403 });
  }

  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role: newRole },
    select: { id: true, username: true, role: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: 'CHANGE_ROLE',
      targetId,
      details: `Changed "${target.username}" from ${target.role} to ${newRole}`,
    },
  });

  return NextResponse.json(updated);
}
