import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Circle, Clock, Plus, Trash2 } from 'lucide-react';
import { Goal } from '@/services/goals';

interface GoalListProps {
    goals: Goal[];
    isAddingGoal: boolean;
    newGoalText: string;
    onAddGoal: () => void;
    onToggleGoal: (id: string) => void;
    onDeleteGoal: (id: string) => void;
    onSetNewGoalText: (text: string) => void;
    onSetIsAddingGoal: (isAdding: boolean) => void;
}

export function GoalList({
    goals,
    isAddingGoal,
    newGoalText,
    onAddGoal,
    onToggleGoal,
    onDeleteGoal,
    onSetNewGoalText,
    onSetIsAddingGoal
}: GoalListProps) {
    const completedCount = goals.filter(g => g.completed).length;

    return (
        <Card className="rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <div className="flex items-baseline gap-2">
                            <CardTitle>Today's Goals</CardTitle>
                            <span className="text-xs text-muted-foreground font-normal">
                                {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <CardDescription>
                            {completedCount} of {goals.length} completed
                        </CardDescription>
                    </div>
                    {!isAddingGoal && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onSetIsAddingGoal(true)}
                            className="rounded-full hover:bg-primary/10 hover:text-primary"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {goals.length > 0 ? (
                    <ul className="space-y-3">
                        {goals.map((goal) => (
                            <li key={goal.id} className="flex items-start gap-3 group animate-in fade-in slide-in-from-left-2 duration-300">
                                <button
                                    onClick={() => onToggleGoal(goal.id)}
                                    className="mt-0.5 flex-shrink-0 transition-transform active:scale-90"
                                >
                                    {goal.completed ? (
                                        <CheckCircle2 className="w-5 h-5 text-primary" />
                                    ) : (
                                        <Circle className="w-5 h-5 text-muted-foreground/30 hover:text-primary/50 transition-colors" />
                                    )}
                                </button>
                                <div className="flex-1 min-w-0">
                                    <span className={`text-sm block transition-all ${goal.completed ? 'line-through text-muted-foreground font-light' : 'text-foreground font-medium'}`}>
                                        {goal.text}
                                    </span>
                                    {goal.startTime && goal.endTime && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                            <Clock className="w-3 h-3" />
                                            {goal.startTime === '00:00' && goal.endTime === '23:59'
                                                ? 'All day'
                                                : `${goal.startTime} - ${goal.endTime}`}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => onDeleteGoal(goal.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive p-1 rounded-md"
                                    aria-label="Delete goal"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : !isAddingGoal && (
                    <div className="text-center py-6">
                        <p className="text-sm text-muted-foreground">No goals set for today.</p>
                    </div>
                )}

                {isAddingGoal && (
                    <div className="pt-2 animate-in zoom-in-95 duration-200">
                        <Input
                            placeholder="What needs to be done?"
                            value={newGoalText}
                            onChange={(e) => onSetNewGoalText(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') onAddGoal();
                                if (e.key === 'Escape') onSetIsAddingGoal(false);
                            }}
                            autoFocus
                            className="bg-background/80 border-primary/20 focus-visible:ring-primary/20"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onSetIsAddingGoal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={onAddGoal}
                                disabled={!newGoalText.trim()}
                            >
                                Add Goal
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
