import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Brain, PlayCircle, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { VideoNoteTaker } from './VideoNoteTaker';

interface QuickActionsProps {
    onTakeQuiz: () => void;
}

export function QuickActions({ onTakeQuiz }: QuickActionsProps) {
    const navigate = useNavigate();
    const [showVideoNoteTaker, setShowVideoNoteTaker] = useState(false);

    const actions = [
        {
            title: 'Take Quiz',
            icon: <Brain className="w-5 h-5" />,
            onClick: onTakeQuiz,
        },
        {
            title: 'Study with Video',
            icon: <PlayCircle className="w-5 h-5" />,
            onClick: () => setShowVideoNoteTaker(true),
        },
        {
            title: 'Study Notes',
            icon: <BookOpen className="w-5 h-5" />,
            onClick: () => navigate('/student/study-notes'),
        },
        {
            title: 'Practice Analytics',
            icon: <Target className="w-5 h-5" />,
            onClick: () => navigate('/student/practice'),
        }
    ];

    return (
        <>
            <Card className="border-none bg-transparent shadow-none hover:shadow-none">
                <CardHeader className="px-0 pt-0">
                    <CardTitle className="text-xl">Quick Actions</CardTitle>
                    <CardDescription>What's on the agenda today?</CardDescription>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    <div className="grid grid-cols-2 gap-3">
                        {actions.map((action, index) => (
                            <Button
                                key={index}
                                variant="secondary"
                                onClick={action.onClick}
                                className="h-auto py-4 flex flex-col items-center gap-2 rounded-2xl transition-all hover:scale-[1.02] bg-primary/5 hover:bg-primary/10 text-primary border-none shadow-none"
                            >
                                <div className="p-2 rounded-full bg-primary/10">
                                    {action.icon}
                                </div>
                                <span className="font-semibold text-foreground">{action.title}</span>
                            </Button>
                        ))}
                    </div>
                </CardContent>
            </Card>

            <VideoNoteTaker
                open={showVideoNoteTaker}
                onOpenChange={setShowVideoNoteTaker}
            />
        </>
    );
}
