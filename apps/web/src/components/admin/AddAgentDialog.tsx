import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAgent } from '@/hooks/useArticles';

const agentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  visionPromptInstruction: z.string().max(1000, 'Vision prompt instruction is too long'),
  isActive: z.boolean(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface AddAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (agentId: string) => void;
}

export function AddAgentDialog({ open, onOpenChange, onSuccess }: AddAgentDialogProps) {
  const createAgentMutation = useCreateAgent();

  const form = useForm<AgentFormValues>({
    resolver: zodResolver(agentSchema),
    defaultValues: {
      name: '',
      description: '',
      systemPrompt: '',
      visionPromptInstruction: '',
      isActive: true,
    },
  });

  const onSubmit = async (data: AgentFormValues) => {
    try {
      const slug = generateSlug(data.name);
      const agent = await createAgentMutation.mutateAsync({
        ...data,
        slug,
        description: data.description || null,
        visionPromptInstruction: data.visionPromptInstruction || null,
      });
      form.reset();
      onOpenChange(false);
      onSuccess(agent.id);
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to create agent',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create New Agent</DialogTitle>
          <DialogDescription>
            Add a new agent to handle specific types of queries.
          </DialogDescription>
        </DialogHeader>

        {form.formState.errors.root && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
            {form.formState.errors.root.message}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Customer Support Agent" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Handles customer inquiries and support tickets"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="systemPrompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>System Prompt</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="You are a helpful assistant that..."
                      rows={6}
                      className="max-h-[200px] resize-none overflow-y-auto"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Instructions that define the agent's behavior</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="visionPromptInstruction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vision Prompt Instruction (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Focus on technical diagrams and extract all visible labels..."
                      rows={3}
                      className="max-h-[150px] resize-none overflow-y-auto"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Additional instructions for analyzing images uploaded to this agent
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createAgentMutation.isPending}>
                {createAgentMutation.isPending ? 'Creating...' : 'Create Agent'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
