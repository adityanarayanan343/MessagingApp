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

  // Load user data and chats
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      router.push('/');
      return;
    }
    const userData = JSON.parse(storedUser);
    setUser(userData);
    loadChats(userData.id);
  }, [router]);

  const loadChats = async (userId: string) => {
    try {
      const response = await fetch(`/api/conversations?userId=${userId}`);
      const data = await response.json();
      if (response.ok) {
        setChats(data);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/messages?conversationId=${conversationId}`);
      const data = await response.json();
      if (response.ok) {
        setMessages(data);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

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
    try {
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          participantIds: [user?.id, otherUser.id],
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setChats([...chats, data]);
        setSelectedChat(data.id);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    loadMessages(chatId);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedChat || !user) return;

    try {
      const response = await fetch('/api/messages', {
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

      const data = await response.json();
      if (response.ok) {
        setMessages([...messages, data]);
        setNewMessage('');
        // Reload chats to update last message
        loadChats(user.id);
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  // Add this effect to handle real-time updates
  useEffect(() => {
    if (!selectedChat) return;

    const eventSource = new EventSource(`/api/messages/sse?conversationId=${selectedChat}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'initial') {
        setMessages(data.messages);
      } else if (data.type === 'update') {
        setMessages(prev => [...prev, ...data.messages]);
      }
    };

    return () => {
      eventSource.close();
    };
  }, [selectedChat]);

  if (!user) {
    return <LoadingSpinner />;
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
              {chats.map((chat) => {
                const otherParticipant = chat.participants?.find(
                  (p) => p.user.id !== user?.id
                )?.user;
                const lastMessage = chat.messages?.[0]?.content || 'No messages yet';
                const messageCount = chat.messages?.length || 0;

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
                      {messageCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                          {messageCount}
                        </span>
                      )}
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