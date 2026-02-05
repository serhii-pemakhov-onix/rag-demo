import { useEffect, useRef } from 'react';
import type { ChatImage, ChatSource } from '@/api/chat';
import { Message } from './Message';

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  images?: ChatImage[];
  sources?: ChatSource[];
}

interface MessageListProps {
  messages: ChatMessage[];
  isTyping?: boolean;
}

function TypingIndicator() {
  return (
    <div className="flex mb-4 justify-start">
      <div className="inline-flex gap-1 px-4 py-3 bg-muted rounded-lg rounded-bl-none">
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

export function MessageList({ messages, isTyping }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 && !isTyping ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p>Start a conversation by typing a message below.</p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <Message
              key={message.id}
              content={message.content}
              role={message.role}
              images={message.images}
              sources={message.sources}
            />
          ))}
          {isTyping && <TypingIndicator />}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
