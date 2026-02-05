import { useState } from 'react';
import type { ChatHistoryMessage } from '@/api/chat';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useSendMessage } from '@/hooks/useChat';
import { AgentSelector } from './AgentSelector';
import { MessageInput } from './MessageInput';
import { type ChatMessage, MessageList } from './MessageList';

export function ChatWindow() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentId, setAgentId] = useState('');
  const sendMessage = useSendMessage();

  const handleAgentChange = (value: string) => {
    setAgentId(value);
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

    try {
      const result = await sendMessage.mutateAsync({
        message: content,
        agentId,
        history,
      });

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: result.response,
        role: 'assistant',
        images: result.images,
        sources: result.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat send failed:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Sorry, something went wrong: ${error instanceof Error ? error.message : String(error)}`,
        role: 'assistant',
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
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
            disabled={sendMessage.isPending}
          />
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <MessageList messages={messages} isTyping={sendMessage.isPending} />
        <MessageInput
          onSend={handleSend}
          disabled={sendMessage.isPending || !agentId}
        />
      </CardContent>
    </Card>
  );
}
