import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SuccessRateGaugeProps {
  rate: number;
  label?: string;
}

export function SuccessRateGauge({ rate, label = 'Success Rate' }: SuccessRateGaugeProps) {
  // Determine color based on rate
  const getColor = (rate: number) => {
    if (rate >= 80) return 'text-primary';
    if (rate >= 50) return 'text-muted-foreground';
    return 'text-destructive';
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-4">
          <div className={`text-4xl font-bold ${getColor(rate)}`}>
            {rate}%
          </div>
          <Progress value={rate} className="mt-4 h-2 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
