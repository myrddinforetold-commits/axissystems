import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TaskTrend } from '@/hooks/useRoleAnalytics';
import { format, parseISO } from 'date-fns';

interface TaskCompletionChartProps {
  data: TaskTrend[];
}

export function TaskCompletionChart({ data }: TaskCompletionChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      date: format(parseISO(item.date), 'MMM d'),
    }));
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Activity (Last 14 Days)</CardTitle>
        <CardDescription>Tasks created by status outcome</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Legend />
              <Bar 
                dataKey="completed" 
                name="Completed" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="blocked" 
                name="Blocked" 
                fill="hsl(var(--destructive))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="stopped" 
                name="Stopped" 
                fill="hsl(var(--muted-foreground))" 
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
