import { createFileRoute } from '@tanstack/react-router';
import { ChatWindow } from '@/components/chat/ChatWindow';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 h-[calc(100vh-73px)]">
      <ChatWindow />
    </main>
  );
}
