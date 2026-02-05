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
        <p className="whitespace-pre-wrap">{content}</p>

        {!isUser && images && images.length > 0 && (
          <div className="grid grid-cols-2 gap-2 mt-3">
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

        {!isUser && sources && sources.length > 0 && (
          <div className="mt-3 pt-2 border-t border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Sources:</p>
            <ul className="space-y-0.5">
              {sources.map((source) => (
                <li key={`${source.type}-${source.id}`} className="text-xs text-muted-foreground">
                  <span className="capitalize">{source.type}</span>: {source.title}{' '}
                  <span className="opacity-60">({Math.round(source.score * 100)}%)</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
