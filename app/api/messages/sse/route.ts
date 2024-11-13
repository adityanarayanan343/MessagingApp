import { PrismaClient } from '@prisma/client';
import { NextResponse } from 'next/server';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get('conversationId');

  if (!conversationId) {
    return NextResponse.json({ error: 'Conversation ID required' }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      type SSEMessage = {
        type: 'initial' | 'update';
        messages: Array<{
          id: string;
          content: string;
          senderId: string;
          conversationId: string;
          createdAt: Date;
          updatedAt: Date;
          sender: {
            id: string;
            firstName: string | null;
            lastName: string | null;
          };
        }>;
      };
      
      const sendMessage = (message: SSEMessage) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
      };

      // Initial messages
      const messages = await prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      });

      sendMessage({ type: 'initial', messages });

      // Subscribe to new messages
      // This is a simplified example. In production, you'd want to use a proper pub/sub system
      const interval = setInterval(async () => {
        const newMessages = await prisma.message.findMany({
          where: {
            conversationId,
            createdAt: {
              gt: new Date(Date.now() - 1000), // Last second
            },
          },
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        });

        if (newMessages.length > 0) {
          sendMessage({ type: 'update', messages: newMessages });
        }
      }, 1000);

      // Cleanup
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 