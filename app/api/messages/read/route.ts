import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { conversationId, userId } = await request.json();

    await prisma.message.updateMany({
      where: {
        conversationId,
        senderId: {
          not: userId
        },
        read: false
      },
      data: {
        read: true
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark messages as read error:', error);
    return NextResponse.json(
      { error: 'Error marking messages as read' },
      { status: 500 }
    );
  }
} 