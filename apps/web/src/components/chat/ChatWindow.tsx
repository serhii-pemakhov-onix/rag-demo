import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageInput } from './MessageInput';
import { type ChatMessage, MessageList } from './MessageList';

const MOCK_RESPONSES = [
  "I'm a demo chatbot. The API connection is not implemented yet.",
  'This is a placeholder response. In the full version, I would connect to the RAG backend.',
  'Thanks for your message! The chat functionality is currently in demo mode.',
  "I'm here to help! However, this is just a UI demonstration.",
];

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSend = (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: MOCK_RESPONSES[Math.floor(Math.random() * MOCK_RESPONSES.length)],
        role: 'assistant',
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 500);
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle>RAG Chat</CardTitle>
        <CardDescription>Ask questions about your documents</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <MessageList messages={messages} />
        <MessageInput onSend={handleSend} />
      </CardContent>
    </Card>
  );
}
