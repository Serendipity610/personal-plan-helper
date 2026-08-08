import { useEffect, useState, useCallback } from "react";
import { LayoutDashboard } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ResponsiveContainer,
  Legend,
} from "recharts";
import * as api from "@/lib/api";
import { toastApiError } from "@/lib/toast";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  DashboardStats,
  CompletionTrendPoint,
  DistributionItem,
  DashboardPeriod,
} from "@/types";

// ── Period → days mapping ──────────────────────────────────

const PERIOD_DAYS: Record<DashboardPeriod, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  year: 365,
};

const PERIOD_LABELS: { key: DashboardPeriod; label: string }[] = [
  { key: "week", label: "周" },
  { key: "month", label: "月" },
  { key: "quarter", label: "季" },
  { key: "year", label: "年" },
];

// ── Progress Ring ──────────────────────────────────────────

function ProgressRing({ pct }: { pct: number }) {
  const radius = 20;
  const stroke = 3;
  const normalized = Math.min(Math.max(pct, 0), 100);
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (normalized / 100) * circumference;

  return (
    <svg width="52" height="52" viewBox="0 0 52 52" className="shrink-0">
      <circle
        cx="26"
        cy="26"
        r={radius}
        fill="none"
        stroke="hsl(var(--muted))"
        strokeWidth={stroke}
      />
      <circle
        cx="26"
        cy="26"
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 26 26)"
      />
    </svg>
  );
}

// ── StatCard ───────────────────────────────────────────────

function StatCard({
  title,
  value,
  subtitle,
  ring,
  highlight,
}: {
  title: string;
  value: string;
  subtitle?: string;
  ring?: boolean;
  highlight?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <div
            className={`text-2xl font-bold ${
              highlight ? "text-destructive" : ""
            }`}
          >
            {value}
          </div>
          {ring && <ProgressRing pct={Number.parseFloat(value) || 0} />}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── PeriodSwitcher ─────────────────────────────────────────

function PeriodSwitcher({
  period,
  onChange,
}: {
  period: DashboardPeriod;
  onChange: (p: DashboardPeriod) => void;
}) {
  return (
    <div className="inline-flex rounded-md border" role="group">
      {PERIOD_LABELS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          role="button"
          aria-label={label}
          onClick={() => onChange(key)}
          className={`px-3 py-1 text-sm transition-colors first:rounded-l-md last:rounded-r-md ${
            period === key
              ? "bg-primary text-primary-foreground"
              : "bg-background hover:bg-accent"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Chart wrapper ──────────────────────────────────────────

function ChartCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [trend, setTrend] = useState<CompletionTrendPoint[]>([]);
  const [urgencyDist, setUrgencyDist] = useState<DistributionItem[]>([]);
  const [categoryDist, setCategoryDist] = useState<DistributionItem[]>([]);
  const [period, setPeriod] = useState<DashboardPeriod>("week");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(p: DashboardPeriod) {
      setLoading(true);
      setError(null);
      try {
        const days = PERIOD_DAYS[p];
        const [s, t, u, c] = await Promise.all([
          api.getDashboardStats(),
          api.getCompletionTrend(days),
          api.getUrgencyDistribution(days),
          api.getCategoryDistribution(days),
        ]);
        if (!cancelled) {
          setStats(s);
          setTrend(t);
          setUrgencyDist(u);
          setCategoryDist(c);
        }
      } catch (e) {
        if (!cancelled) {
          setError(`加载失败: ${String(e)}`);
          toastApiError("加载总览", e);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load(period);
    return () => {
      cancelled = true;
    };
  }, [period]);

  const handlePeriodChange = useCallback((p: DashboardPeriod) => {
    setPeriod(p);
  }, []);

  // ── Loading state ──
  if (loading && !stats) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">数据总览</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  <Skeleton className="h-4 w-16" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="flex h-64 items-center justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex h-64 items-center justify-center">
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ── Error state ──
  if (error && !stats) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">数据总览</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-destructive">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Empty state ──
  if (stats && stats.total_plans === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">数据总览</h2>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-2">
            <LayoutDashboard className="mb-2 h-12 w-12 text-muted-foreground opacity-40" />
            <p className="text-lg font-medium text-muted-foreground">
              暂无数据
            </p>
            <p className="text-sm text-muted-foreground">
              创建第一个计划开始使用，看板数据将在此展示
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Derived values ──
  const weekChangeStr =
    stats && stats.week_change !== 0
      ? `较上周 ${stats.week_change > 0 ? "+" : ""}${stats.week_change}`
      : "与上周持平";

  // ── Pie chart colors ──
  const PIE_COLORS = [
    "#3B82F6",
    "#10B981",
    "#F59E0B",
    "#8B5CF6",
    "#EF4444",
    "#EC4899",
    "#06B6D4",
    "#84CC16",
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">数据总览</h2>

      {/* Stat cards row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="总计划数"
          value={stats ? String(stats.total_plans) : "0"}
          subtitle={weekChangeStr ?? undefined}
        />
        <StatCard
          title="完成率"
          value={
            stats ? `${(Math.round(stats.completion_rate * 10) / 10).toFixed(1)}%` : "0%"
          }
          ring
        />
        <StatCard title="今日待办" value={stats ? String(stats.today_pending) : "0"} />
        <StatCard
          title="逾期"
          value={stats ? String(stats.overdue_count) : "0"}
          highlight={!!stats && stats.overdue_count > 0}
        />
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Category distribution pie chart */}
        <ChartCard title="分类分布">
          {categoryDist.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryDist}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }) => `${name} (${value})`}
                >
                  {categoryDist.map((entry, idx) => (
                    <Cell
                      key={entry.key || idx}
                      fill={entry.color || PIE_COLORS[idx % PIE_COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              暂无分类数据
            </div>
          )}
        </ChartCard>

        {/* Completion trend line chart */}
        <ChartCard
          title="完成趋势"
          action={
            <PeriodSwitcher period={period} onChange={handlePeriodChange} />
          }
        >
          {trend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  name="完成数"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              暂无趋势数据
            </div>
          )}
        </ChartCard>
      </div>

      {/* Urgency distribution bar chart — full width */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">紧急度分布</CardTitle>
        </CardHeader>
        <CardContent className="h-64">
          {urgencyDist.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={urgencyDist}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="count"
                  fill="hsl(var(--primary))"
                  radius={[4, 4, 0, 0]}
                  name="计划数"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              暂无分布数据
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
