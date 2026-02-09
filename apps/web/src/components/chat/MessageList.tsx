import { useCallback, useEffect, useRef } from 'react';
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
  sendCount?: number;
}

function TypingIndicator() {
  return (
    <div className="mb-4 flex justify-start">
      <div className="inline-flex gap-1 rounded-lg rounded-bl-none bg-muted px-4 py-3">
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
      </div>
    </div>
  );
}

export function MessageList({ messages, isTyping, sendCount = 0 }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }
    const handleScroll = () => {
      isNearBottomRef.current =
        container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    };
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Force scroll on new user message
  useEffect(() => {
    if (sendCount > 0) {
      isNearBottomRef.current = true;
      scrollToBottom();
    }
  }, [sendCount, scrollToBottom]);

  // Auto-scroll on content changes only if near bottom
  useEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4">
      {messages.length === 0 && !isTyping ? (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p>Start a conversation by typing a message below.</p>
        </div>
      ) : (
        <>
          {messages.map((message, index) => (
            <Message
              key={message.id}
              content={message.content}
              role={message.role}
              images={message.images}
              sources={message.sources}
              isTyping={isTyping && index === messages.length - 1 && message.role === 'assistant'}
            />
          ))}
          {isTyping && messages.at(-1)?.role !== 'assistant' && <TypingIndicator />}
        </>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
