'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoadingSpinner from '../../components/LoadingSpinner';

interface User {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

interface Chat {
  id: string;
  participants: {
    user: {
      id: string;
      firstName: string | null;
      lastName: string | null;
    };
  }[];
  messages: Message[];
  _count: {
    messages: number;
  };
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  timestamp: Date;
}

export default function HomePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  // Load user data and chats
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          throw new Error('Not authenticated');
        }
        const userData = await response.json();
        setUser(userData);
        loadChats(userData.id);
      } catch (error) {
        console.error('Auth error:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, [router]);

  const loadChats = async (userId: string) => {
    try {
      console.log('Loading chats for user:', userId);
      const response = await fetch(`/api/conversations?userId=${userId}`);
      const data = await response.json();
      console.log('Chats response:', data);
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load chats');
      }
      
      setChats(data);
    } catch (error) {
      console.error('Error loading chats:', error);
      setChats([]); // Set empty array on error
    }
  };

  // const loadMessages = async (conversationId: string) => {
  //   try {
  //     const response = await fetch(`/api/messages?conversationId=${conversationId}`);
  //     const data = await response.json();
  //     if (response.ok) {
  //       setMessages(data);
  //     }
  //   } catch (error) {
  //     console.error('Error loading messages:', error);
  //   }
  // };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(`/api/users/search?q=${query}&currentUserId=${user?.id}`);
      const data = await response.json();
      if (response.ok) {
        setSearchResults(data);
      }
    } catch (error) {
      console.error('Search error:', error);
    }
    setIsSearching(false);
  };

  const startNewChat = async (otherUser: User) => {
    if (!user?.id) {
      console.error('No user found');
      return;
    }

    try {
      const participantIds = [user.id, otherUser.id];
      console.log('Creating chat with participants:', participantIds);

      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ participantIds }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create chat');
      }

      const data = await response.json();
      console.log('Chat created successfully:', data);
      
      setChats(prevChats => [...prevChats, data]);
      setSelectedChat(data.id);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error creating chat:', error);
      // You might want to show this error to the user
      // setError(error instanceof Error ? error.message : 'Failed to create chat');
    }
  };

  const handleChatSelect = async (chatId: string) => {
    setSelectedChat(chatId);
    
    // Mark messages as read
    if (user?.id) {
      try {
        await fetch('/api/messages/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: chatId,
            userId: user.id
          }),
        });
        
        setChats(prevChats =>
          prevChats.map(chat =>
            chat.id === chatId
              ? { ...chat, _count: { messages: 0 } }
              : chat
          )
        );
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    const tempMessage = {
      id: Date.now().toString(), // temporary ID
      content: newMessage,
      senderId: user.id,
      timestamp: new Date(),
    };

    // Optimistically update UI
    setMessages(prev => [...prev, tempMessage]);
    setNewMessage('');

    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newMessage,
          senderId: user.id,
          conversationId: selectedChat,
        }),
      });

      // No need to update messages here as SSE will handle it
      // Just reload chats to update last message
      if (user?.id) {
        loadChats(user.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Optionally handle error by removing the temporary message
      setMessages(prev => prev.filter(msg => msg.id !== tempMessage.id));
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout API endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
      });
      
      // Clear client-side storage
      localStorage.removeItem('user');
      
      // Redirect to login page
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleDeleteChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent chat selection when clicking delete
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    try {
      const response = await fetch(`/api/conversations?conversationId=${chatId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete chat');
      }

      // Remove chat from state
      setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
      if (selectedChat === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
    }
  };

  useEffect(() => {
    if (!selectedChat) {
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      return;
    }

    const newEventSource = new EventSource(`/api/messages/sse?conversationId=${selectedChat}`);
    
    newEventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'initial') {
        setMessages(data.messages);
      } else if (data.type === 'update') {
        setMessages(prev => [...prev, ...data.messages]);
      }
    };

    setEventSource(newEventSource);

    return () => {
      newEventSource.close();
    };
  }, [selectedChat]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    router.push('/');
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
          <div className="w-1/4 bg-white border-r border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">
                    {user.firstName} {user.lastName}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md"
                  >
                    Logout
                  </button>
                </div>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                
                {searchQuery && (
                  <div className="mt-2">
                    {isSearching ? (
                      <div className="text-center text-gray-500">Searching...</div>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((result) => (
                          <div
                            key={result.id}
                            onClick={() => startNewChat(result)}
                            className="p-2 hover:bg-gray-50 cursor-pointer rounded-lg"
                          >
                            <div className="font-medium">
                              {result.firstName} {result.lastName}
                            </div>
                            <div className="text-sm text-gray-500">{result.email}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">No users found</div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(100vh-73px)]">
              {/* Remove duplicates by using Set with chat IDs */}
              {Array.from(new Set(chats.map(chat => chat.id))).map(chatId => {
                const chat = chats.find(c => c.id === chatId)!;
                const otherParticipant = chat.participants?.find(
                  (p) => p.user.id !== user?.id
                )?.user;
                
                const lastMessage = chat.messages?.[0]?.content ?? 'No messages yet';

                return (
                  <div
                    key={chat.id}
                    onClick={() => handleChatSelect(chat.id)}
                    className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
                      selectedChat === chat.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold text-gray-900">
                        {otherParticipant?.firstName} {otherParticipant?.lastName}
                      </h3>
                      <div className="flex items-center space-x-2">
                        {chat._count?.messages > 0 && selectedChat !== chat.id && (
                          <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                            {chat._count.messages}
                          </span>
                        )}
                        <button
                          onClick={(e) => handleDeleteChat(chat.id, e)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{lastMessage}</p>
                  </div>
                );
              })}
            </div>
        </div>
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {chats.find(chat => chat.id === selectedChat)?.participants?.find(
                  p => p.user.id !== user?.id
                )?.user?.firstName || 'Chat'} {' '}
                {chats.find(chat => chat.id === selectedChat)?.participants?.find(
                  p => p.user.id !== user?.id
                )?.user?.lastName}
              </h2>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderId === user?.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] p-3 rounded-lg ${
                      message.senderId === user?.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-900'
                    }`}
                  >
                    {message.content}
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Send
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a chat to start messaging
          </div>
        )}
      </div>
    </div>
  );
}