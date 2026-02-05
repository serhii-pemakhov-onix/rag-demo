import type { ChatImage, ChatSource } from '@/api/chat';
import { cn } from '@/lib/utils';

interface MessageProps {
  content: string;
  role: 'user' | 'assistant';
  images?: ChatImage[];
  sources?: ChatSource[];
}

export function Message({ content, role, images, sources }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex mb-4', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] px-4 py-2 rounded-lg',
          isUser
            ? 'bg-primary text-primary-foreground rounded-br-none'
            : 'bg-muted text-foreground rounded-bl-none',
        )}
      >
        {!isUser && images && images.length > 0 && (
          <div className={cn('grid grid-cols-2 gap-2', content && 'mb-3')}>
            {images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.description}
                className="rounded-md w-full h-auto object-cover"
              />
            ))}
          </div>
        )}

        <p className="whitespace-pre-wrap">{content}</p>

      </div>
    </div>
  );
}
