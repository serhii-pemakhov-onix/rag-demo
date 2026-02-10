import { createFileRoute } from '@tanstack/react-router';
import { Bot, FileText, Image, Layers } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import type { AgentContent, DashboardOverview, RecentActivityItem } from '@/api/admin';
import { StatusBadge } from '@/components/admin/status-badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { useDashboard } from '@/hooks/useDashboard';

export const Route = createFileRoute('/admin/')({
  component: DashboardPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  description?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-medium text-sm">{label}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="font-bold text-2xl">{value.toLocaleString()}</div>
        {description && <p className="text-muted-foreground text-xs">{description}</p>}
      </CardContent>
    </Card>
  );
}

function OverviewCards({ overview }: { overview: DashboardOverview }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <StatCard
        icon={Bot}
        label="Agents"
        value={overview.totalAgents}
        description={`${overview.activeAgents} active, ${overview.inactiveAgents} inactive`}
      />
      <StatCard icon={FileText} label="Documents" value={overview.totalDocuments} />
      <StatCard icon={Image} label="Images" value={overview.totalImages} />
      <StatCard icon={Layers} label="Chunks" value={overview.totalChunks} />
    </div>
  );
}

const chartConfig = {
  documentCount: {
    label: 'Documents',
    color: 'var(--chart-1)',
  },
  imageCount: {
    label: 'Images',
    color: 'var(--chart-2)',
  },
} satisfies ChartConfig;

function ContentPerAgentChart({ data }: { data: AgentContent[] }) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content per Agent</CardTitle>
          <CardDescription>Document and image counts by agent</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No agents yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Content per Agent</CardTitle>
        <CardDescription>Document and image counts by agent</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
          <BarChart accessibilityLayer data={data}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="agentName" tickLine={false} tickMargin={10} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="documentCount" fill="var(--color-documentCount)" radius={4} />
            <Bar dataKey="imageCount" fill="var(--color-imageCount)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) {
    return 'just now';
  }
  if (diffMin < 60) {
    return `${diffMin}m ago`;
  }
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) {
    return `${diffDays}d ago`;
  }
  return new Date(dateStr).toLocaleDateString();
}

function RecentActivity({ items }: { items: RecentActivityItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest uploads across all agents</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground">No activity yet.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="flex items-center gap-3">
                {item.type === 'document' ? (
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                ) : (
                  <Image className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
                <StatusBadge status={item.status} />
                <span className="hidden shrink-0 text-muted-foreground text-xs sm:inline">
                  {item.agentName}
                </span>
                <span className="shrink-0 text-muted-foreground text-xs">
                  {formatTimeAgo(item.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data, isLoading, error } = useDashboard();

  if (isLoading) {
    return (
      <div>
        <h1 className="mb-6 font-bold text-2xl">Dashboard</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <h1 className="mb-6 font-bold text-2xl">Dashboard</h1>
        <p className="text-destructive">Failed to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-bold text-2xl">Dashboard</h1>
      <OverviewCards overview={data.overview} />
      <ContentPerAgentChart data={data.contentPerAgent} />
      <RecentActivity items={data.recentActivity} />
    </div>
  );
}
