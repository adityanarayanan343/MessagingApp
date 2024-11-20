import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { participantIds } = await request.json();

    // Create a new conversation
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: participantIds.map((userId: string) => ({
            userId,
          })),
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    return NextResponse.json(
      { error: 'Error creating conversation' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        messages: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 1,
          include: {
            sender: true
          }
        },
        _count: {
          select: {
            messages: {
              where: {
                read: false,
                senderId: {
                  not: userId
                }
              }
            }
          }
        }
      },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    return NextResponse.json(
      { error: 'Error fetching conversations' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const userId = searchParams.get('userId');

    if (!conversationId || !userId) {
      return NextResponse.json(
        { error: 'Conversation ID and User ID are required' },
        { status: 400 }
      );
    }

    // Remove the user from the conversation participants
    await prisma.conversationParticipant.deleteMany({
      where: {
        conversationId,
        userId,
      },
    });

    // Check if there are any participants left
    const remainingParticipants = await prisma.conversationParticipant.findMany({
      where: { conversationId },
    });

    // If no participants are left, delete the conversation
    if (remainingParticipants.length === 0) {
      await prisma.conversation.delete({
        where: { id: conversationId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete conversation error:', error);
    return NextResponse.json(
      { error: 'Error deleting conversation' },
      { status: 500 }
    );
  }
} 