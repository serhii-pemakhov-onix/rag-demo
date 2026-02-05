import { useRef, useState } from 'react';
import type { ChatHistoryMessage } from '@/api/chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useStreamChat } from '@/hooks/useChat';
import { AgentSelector } from './AgentSelector';
import { MessageInput } from './MessageInput';
import { type ChatMessage, MessageList } from './MessageList';

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentId, setAgentId] = useState(() => localStorage.getItem('agent:chat') ?? '');
  const { streamState, sendStream, abort } = useStreamChat();
  const assistantMessageRef = useRef<ChatMessage | null>(null);

  const handleAgentChange = (value: string) => {
    abort();
    setAgentId(value);
    localStorage.setItem('agent:chat', value);
    setMessages([]);
  };

  const handleSend = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      role: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);

    const history: ChatHistoryMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const assistantId = (Date.now() + 1).toString();
    assistantMessageRef.current = null;

    await sendStream(
      { message: content, agentId, history },
      {
        onSources: (data) => {
          const msg: ChatMessage = {
            id: assistantId,
            content: '',
            role: 'assistant',
            images: data.images,
            sources: data.sources,
          };
          assistantMessageRef.current = msg;
          setMessages((prev) => [...prev, msg]);
        },
        onToken: (data) => {
          if (assistantMessageRef.current) {
            assistantMessageRef.current = {
              ...assistantMessageRef.current,
              content: assistantMessageRef.current.content + data.content,
            };
            const updated = assistantMessageRef.current;
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? updated : m)));
          }
        },
        onDone: () => {
          assistantMessageRef.current = null;
        },
        onError: (data) => {
          if (assistantMessageRef.current) {
            assistantMessageRef.current = {
              ...assistantMessageRef.current,
              content: `${assistantMessageRef.current.content}\n\nError: ${data.message}`,
            };
            const updated = assistantMessageRef.current;
            setMessages((prev) => prev.map((m) => (m.id === assistantId ? updated : m)));
          } else {
            const errorMessage: ChatMessage = {
              id: assistantId,
              content: `Sorry, something went wrong: ${data.message}`,
              role: 'assistant',
            };
            setMessages((prev) => [...prev, errorMessage]);
          }
          assistantMessageRef.current = null;
        },
      },
    );
  };

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>RAG Chat</CardTitle>
            <CardDescription>Ask questions about your documents</CardDescription>
          </div>
          <AgentSelector
            value={agentId}
            onChange={handleAgentChange}
            disabled={streamState.isStreaming}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <MessageList messages={messages} isTyping={streamState.isPreprocessing} />
        <MessageInput onSend={handleSend} disabled={streamState.isStreaming || !agentId} />
      </CardContent>
    </Card>
  );
}
