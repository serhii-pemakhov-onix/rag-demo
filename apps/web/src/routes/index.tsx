import { createFileRoute } from '@tanstack/react-router';
import { ChatWindow } from '@/components/chat/ChatWindow';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="mx-auto h-[calc(100vh-73px)] max-w-7xl px-4 py-6">
      <ChatWindow />
    </main>
  );
}
