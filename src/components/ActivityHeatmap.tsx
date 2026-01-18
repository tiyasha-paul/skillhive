import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  getActivityHeatmapData,
  getActivityStreak,
  getLongestActivityStreak,
  getTotalActivityCount,
  getActivityForDate,
  type ActivityRecord
} from '@/services/activityTracker';
import { Calendar, Clock, Trophy } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedActivityRecord, setSelectedActivityRecord] = useState<ActivityRecord | null>(null);

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

  // Update selected record when selectedDate changes or data reloads
  useEffect(() => {
    if (selectedDate) {
      const record = getActivityForDate(selectedDate);
      setSelectedActivityRecord(record);
    }
  }, [selectedDate, totalCount]); // update when count changes too

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
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatActivityType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <div className="flex flex-col lg:flex-row">
        {/* Left Column: Header + Heatmap */}
        <div className="flex-1 pr-6">
          <div className="flex items-center justify-between mb-6">
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

          <div className="flex flex-col gap-0.5">
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
              <div className="flex gap-[3px] pb-2">
                <TooltipProvider>
                  {weeksData.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex flex-col gap-[3px]">
                      {week.map((cell, dayIndex) => {
                        if (!cell.date) return <div key={`${weekIndex}-${dayIndex}`} className="w-2 h-2 rounded-[1px] bg-transparent" />;

                        const isSelected = selectedDate === cell.date;

                        return (
                          <Tooltip key={`${weekIndex}-${dayIndex}`}>
                            <TooltipTrigger asChild>
                              <div
                                className={`w-2 h-2 rounded-[1px] cursor-pointer transition-all ${getColorForLevel(cell.level)} ${isSelected ? 'ring-2 ring-primary ring-offset-1 z-10' : ''}`}
                                onMouseEnter={() => setHoveredCell(cell.date)}
                                onMouseLeave={() => setHoveredCell(null)}
                                onClick={() => setSelectedDate(cell.date)}
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
          <div className="flex items-center justify-end gap-1.5 mt-4 text-[10px] text-muted-foreground pr-4">
            <span>Less</span>
            <div className="flex gap-[2px]">
              {[0, 1, 2, 3, 4].map(l => (
                <div key={l} className={`w-2 h-2 rounded-[1px] ${getColorForLevel(l)}`} />
              ))}
            </div>
            <span>More</span>
          </div>
        </div>

        {/* Right Column: Activity History - taking full height */}
        <div className="w-full lg:w-48 border-l pl-0 lg:pl-6 pt-4 lg:pt-0 border-border/50 flex flex-col">
          <div className="bg-muted/30 rounded-lg p-3 w-full border border-border/50 flex flex-col h-[210px] overflow-hidden">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border/50 shrink-0">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Activity History</h3>
            </div>

            {selectedDate ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="mb-2 flex justify-between items-center shrink-0">
                  <span className="text-xs font-medium">{formatDate(selectedDate)}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {selectedActivityRecord?.count || 0} activities
                  </span>
                </div>

                <ScrollArea className="flex-1 pr-3">
                  {selectedActivityRecord && selectedActivityRecord.activities.length > 0 ? (
                    <div className="space-y-2">
                      {selectedActivityRecord.activities.map((activity, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs">
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="text-muted-foreground break-words">{formatActivityType(activity)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-2 opacity-70">
                      <p>No activity recorded</p>
                      <p>on this day.</p>
                    </div>
                  )}
                </ScrollArea>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs text-center p-4 opacity-70">
                <Trophy className="h-8 w-8 mb-2 opacity-20" />
                <p>Click on a square in the heatmap to view details.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
