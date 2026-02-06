import type { ChatImage, ChatSource } from '@/api/chat';
import { cn } from '@/lib/utils';

interface MessageProps {
  content: string;
  role: 'user' | 'assistant';
  images?: ChatImage[];
  sources?: ChatSource[];
  isTyping?: boolean;
}

export function Message({ content, role, images, sources, isTyping }: MessageProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('mb-4 flex', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[70%] rounded-lg px-4 py-2',
          isUser
            ? 'rounded-br-none bg-primary text-primary-foreground'
            : 'rounded-bl-none bg-muted text-foreground',
        )}
      >
        {!isUser && images && images.length > 0 && (
          <div className={cn('grid grid-cols-2 gap-2', content && 'mb-3')}>
            {images.map((image) => (
              <img
                key={image.id}
                src={image.url}
                alt={image.description}
                className="h-auto w-full rounded-md object-cover"
              />
            ))}
          </div>
        )}

        {!isUser && isTyping && !content ? (
          <div className="inline-flex gap-1 py-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.3s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60 [animation-delay:-0.15s]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/60" />
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{content}</p>
        )}
      </div>
    </div>
  );
}
