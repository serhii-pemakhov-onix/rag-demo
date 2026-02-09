import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useActiveAgents } from '@/hooks/useChat';

interface AgentSelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function AgentSelector({ value, onChange, disabled }: AgentSelectorProps) {
  const { data: agents, isLoading } = useActiveAgents();

  return (
    <Select onValueChange={onChange} value={value} disabled={disabled || isLoading}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select an agent" />
      </SelectTrigger>
      <SelectContent position="popper" side="bottom" align="end" className="max-w-[300px]">
        {agents?.map((agent) => (
          <SelectItem key={agent.id} value={agent.id} description={agent.description ?? undefined}>
            {agent.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
