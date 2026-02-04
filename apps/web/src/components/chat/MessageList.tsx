import { useEffect, useRef } from 'react';
import { Message } from './Message';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
}

interface MessageListProps {
  messages: ChatMessage[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p>Start a conversation by typing a message below.</p>
        </div>
      ) : (
        messages.map((message) => (
          <Message key={message.id} content={message.content} role={message.role} />
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
