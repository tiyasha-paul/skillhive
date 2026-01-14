import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getActivityHeatmapData, getActivityStreak, getLongestActivityStreak, getTotalActivityCount } from '@/services/activityTracker';
import { Calendar } from 'lucide-react';

interface HeatmapCell {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

export function ActivityHeatmap() {
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hoveredCell, setHoveredCell] = useState<string | null>(null);

  useEffect(() => {
    loadHeatmapData();

    const handleActivityUpdate = () => {
      loadHeatmapData();
    };

    window.addEventListener('activity-updated', handleActivityUpdate);
    return () => {
      window.removeEventListener('activity-updated', handleActivityUpdate);
    };
  }, []);

  const loadHeatmapData = () => {
    const data = getActivityHeatmapData();
    const currentStreak = getActivityStreak();
    const bestStreak = getLongestActivityStreak();
    const total = getTotalActivityCount();

    setHeatmapData(data);
    setStreak(currentStreak);
    setLongestStreak(bestStreak);
    setTotalCount(total);
  };

  const { weeksData, monthLabels } = useMemo(() => {
    const weeks: HeatmapCell[][] = [];
    const labels: { month: string; index: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - (52 * 7));
    startDate.setHours(0, 0, 0, 0);

    const startDayOfWeek = startDate.getDay();
    const alignedStartDate = new Date(startDate);
    alignedStartDate.setDate(startDate.getDate() - startDayOfWeek);
    alignedStartDate.setHours(0, 0, 0, 0);

    const dataMap = new Map<string, HeatmapCell>();
    heatmapData.forEach(d => {
      dataMap.set(d.date, d);
    });

    let lastMonth = -1;

    for (let week = 0; week <= 52; week++) {
      const weekData: HeatmapCell[] = [];
      const firstDayOfWeek = new Date(alignedStartDate);
      firstDayOfWeek.setDate(alignedStartDate.getDate() + (week * 7));

      const currentMonth = firstDayOfWeek.getMonth();
      if (currentMonth !== lastMonth) {
        labels.push({
          month: firstDayOfWeek.toLocaleString('default', { month: 'short' }),
          index: week
        });
        lastMonth = currentMonth;
      }

      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(alignedStartDate);
        currentDate.setDate(alignedStartDate.getDate() + (week * 7) + day);
        currentDate.setHours(0, 0, 0, 0);

        if (currentDate <= today && currentDate >= alignedStartDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const cellData = dataMap.get(dateStr) || { date: dateStr, count: 0, level: 0 };
          weekData.push(cellData);
        } else {
          weekData.push({ date: '', count: 0, level: 0 });
        }
      }
      weeks.push(weekData);
    }

    return { weeksData: weeks, monthLabels: labels };
  }, [heatmapData]);

  const getColorForLevel = (level: number): string => {
    switch (level) {
      case 0: return 'bg-[#ebedf0] dark:bg-[#161b22]'; // GitHub empty
      case 1: return 'bg-[#9be9a8] dark:bg-[#0e4429]'; // GitHub Level 1
      case 2: return 'bg-[#40c463] dark:bg-[#006d32]'; // GitHub Level 2
      case 3: return 'bg-[#30a14e] dark:bg-[#26a641]'; // GitHub Level 3
      case 4: return 'bg-[#216e39] dark:bg-[#39d353]'; // GitHub Level 4
      default: return 'bg-[#ebedf0] dark:bg-[#161b22]';
    }
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Activity Heatmap
            </CardTitle>
            <CardDescription>
              {totalCount} activit{totalCount !== 1 ? 'ies' : 'y'} in the last year
            </CardDescription>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-primary">{streak} Days</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Current Streak
              </span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-sm font-bold text-primary">{longestStreak} Days</span>
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Longest Streak
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0 pb-0 overflow-hidden">
        <div className="flex flex-col gap-0.5 mt-2">
          {/* Month Labels */}
          <div className="relative h-5 text-[10px] text-muted-foreground ml-8 w-full">
            {monthLabels.map((label, i) => (
              <div
                key={i}
                style={{ 
                  position: 'absolute',
                  left: `${label.index * 11}px` 
                }}
                className="transform -translate-x-1/2"
              >
                {label.month}
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {/* Day Labels */}
            <div className="flex flex-col gap-[3px] py-1 text-[9px] text-muted-foreground w-6 leading-none">
              <div className="h-2"></div>
              <div className="h-2">Mon</div>
              <div className="h-2"></div>
              <div className="h-2">Wed</div>
              <div className="h-2"></div>
              <div className="h-2">Fri</div>
              <div className="h-2"></div>
            </div>

            {/* Heatmap Grid */}
            <div className="flex gap-[3px]">
              <TooltipProvider>
                {weeksData.map((week, weekIndex) => (
                  <div key={weekIndex} className="flex flex-col gap-[3px]">
                    {week.map((cell, dayIndex) => {
                      if (!cell.date) return <div key={`${weekIndex}-${dayIndex}`} className="w-2 h-2 rounded-[1px] bg-transparent" />;

                      return (
                        <Tooltip key={`${weekIndex}-${dayIndex}`}>
                          <TooltipTrigger asChild>
                            <div
                              className={`w-2 h-2 rounded-[1px] cursor-pointer transition-colors ${getColorForLevel(cell.level)} shadow-sm`}
                              onMouseEnter={() => setHoveredCell(cell.date)}
                              onMouseLeave={() => setHoveredCell(null)}
                            />
                          </TooltipTrigger>
                          <TooltipContent className="p-2 text-[10px]">
                            <p className="font-bold">{cell.count > 0 ? `${cell.count} activities` : 'No activity'}</p>
                            <p className="text-muted-foreground">{formatDate(cell.date)}</p>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                ))}
              </TooltipProvider>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-[2px]">
            {[0, 1, 2, 3, 4].map(l => (
              <div key={l} className={`w-2 h-2 rounded-[1px] ${getColorForLevel(l)}`} />
            ))}
          </div>
          <span>More</span>
        </div>
      </CardContent>
    </Card>
  );
}
