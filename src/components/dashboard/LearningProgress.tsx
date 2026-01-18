import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface SubjectPerformance {
    subject: string;
    accuracy: number;
}

interface LearningProgressProps {
    performance: SubjectPerformance[];
}

export function LearningProgress({ performance }: LearningProgressProps) {
    return (
        <Card className="rounded-2xl border shadow-sm transition-all hover:shadow-md">
            <CardHeader>
                <CardTitle>Learning Progress</CardTitle>
                <CardDescription>Mastery across your subjects</CardDescription>
            </CardHeader>
            <CardContent>
                {performance.length > 0 ? (
                    <div className="space-y-5">
                        {performance.slice(0, 5).map((subject) => (
                            <div key={subject.subject} className="space-y-1.5">
                                <div className="flex justify-between items-center px-0.5">
                                    <span className="text-sm font-semibold text-foreground/80">{subject.subject}</span>
                                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                                        {Math.round(subject.accuracy)}%
                                    </span>
                                </div>
                                <Progress value={subject.accuracy} className="h-1.5" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-sm text-muted-foreground text-center py-8 bg-muted/20 rounded-xl border border-dashed">
                        Complete quizzes to see your <br /> mastery stats here.
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
