import { zodResolver } from '@hookform/resolvers/zod';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useAgent, useUpdateAgent } from '@/hooks/useAgents';

export const Route = createFileRoute('/admin/agents/$agentId')({
  component: AgentEditPage,
});

const agentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long'),
  systemPrompt: z.string().min(1, 'System prompt is required'),
  visionPromptInstruction: z.string().max(1000, 'Vision prompt instruction is too long'),
  isActive: z.boolean(),
});

type AgentFormValues = z.infer<typeof agentSchema>;

function AgentEditPage() {
  const { agentId } = Route.useParams();
  const navigate = useNavigate();
  const { data: agent, isLoading, error } = useAgent(agentId);
  const updateMutation = useUpdateAgent();

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

  useEffect(() => {
    if (agent) {
      form.reset({
        name: agent.name,
        description: agent.description || '',
        systemPrompt: agent.systemPrompt,
        visionPromptInstruction: agent.visionPromptInstruction || '',
        isActive: agent.isActive,
      });
    }
  }, [agent, form]);

  const onSubmit = async (data: AgentFormValues) => {
    try {
      await updateMutation.mutateAsync({
        id: agentId,
        data: {
          name: data.name,
          description: data.description || null,
          systemPrompt: data.systemPrompt,
          visionPromptInstruction: data.visionPromptInstruction || null,
          isActive: data.isActive,
        },
      });
      navigate({ to: '/admin/agents' });
    } catch (err) {
      form.setError('root', {
        message: err instanceof Error ? err.message : 'Failed to update agent',
      });
    }
  };

  const handleCancel = () => {
    navigate({ to: '/admin/agents' });
  };

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 font-bold text-2xl">Edit Agent</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div>
        <h1 className="mb-6 font-bold text-2xl">Edit Agent</h1>
        <p className="text-destructive">Failed to load agent</p>
        <Button variant="outline" className="mt-4" onClick={handleCancel}>
          Back to Agents
        </Button>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 font-bold text-2xl">Edit Agent</h1>

      <Card>
        <CardHeader>
          <CardTitle>{agent.name}</CardTitle>
          <CardDescription>
            Slug: <code className="rounded bg-muted px-1 py-0.5">{agent.slug}</code>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {form.formState.errors.root && (
            <div className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive text-sm">
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

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="font-normal">Active</FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
