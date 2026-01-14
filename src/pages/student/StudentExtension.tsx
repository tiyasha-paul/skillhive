import { useState, useEffect } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Chrome, Activity, Brain, MessageSquare, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface ActivityEntry {
    url: string;
    domain: string;
    category: 'Learning' | 'Distraction' | 'Mixed' | 'Neutral' | 'Unknown';
    duration: number; // seconds
    startTime: number;
}

export default function StudentExtension() {
    const [isConnected, setIsConnected] = useState(false);
    const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
    const [stats, setStats] = useState({
        learningTime: 0, // seconds
        distractionTime: 0, // seconds
        focusScore: 0, // percentage
    });

    useEffect(() => {
        // Listen for data from extension content script
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;

            if (event.data.type === 'SKILLHIVE_EXTENSION_DATA') {
                console.log('Dashboard: Received Extension Data', event.data.payload);
                const log: ActivityEntry[] = event.data.payload || [];
                setIsConnected(true);
                setActivityLog(log);
                calculateStats(log);
            }
        };

        window.addEventListener('message', handleMessage);

        // Request initial data
        console.log('Dashboard: requesting extension data...');
        window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');

        // Poll for connection/data every 2 seconds
        const interval = setInterval(() => {
            console.log('Dashboard: polling for extension...');
            window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
        }, 2000);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(interval);
        };
    }, []);

    const calculateStats = (log: ActivityEntry[]) => {
        const today = new Date().setHours(0, 0, 0, 0);
        let learning = 0;
        let distraction = 0;

        log.forEach(entry => {
            if (entry.startTime >= today) {
                if (entry.category === 'Learning') learning += entry.duration;
                if (entry.category === 'Distraction') distraction += entry.duration;
            }
        });

        const total = learning + distraction;
        const score = total > 0 ? Math.round((learning / total) * 100) : 0;

        setStats({
            learningTime: learning,
            distractionTime: distraction,
            focusScore: score
        });
    };

    const formatDuration = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m}m`;
    };

    return (
        <div className="min-h-screen bg-background">
            <StudentNavbar />

            <main className="container mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold flex items-center gap-2">
                            <Activity className="h-8 w-8 text-primary" />
                            Productivity Tracker
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            Track your study habits, get AI insights, and stay focused.
                        </p>
                    </div>

                    <Button size="lg" className="gap-2" onClick={() => window.open('/extension.zip', '_blank')}>
                        <Chrome className="w-5 h-5" />
                        Download Extension
                    </Button>
                </div>

                {!isConnected && (
                    <Alert className="mb-6 bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Extension not detected</AlertTitle>
                        <AlertDescription>
                            Please install the extension and reload this page to see your real-time stats.
                            <br />
                            <span className="text-xs opacity-70">Check browser console (F12) for logs if issues persist.</span>
                        </AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Focus Score</CardTitle>
                            <Activity className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isConnected ? `${stats.focusScore}%` : '--'}</div>
                            <p className="text-xs text-muted-foreground">Based on today's activity</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
                            <Brain className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isConnected ? formatDuration(stats.learningTime) : '--'}</div>
                            <p className="text-xs text-muted-foreground">Today's Total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Distracted Time</CardTitle>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{isConnected ? formatDuration(stats.distractionTime) : '--'}</div>
                            <p className="text-xs text-muted-foreground">Today's Total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">AI Coach</CardTitle>
                            <MessageSquare className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">Active</div>
                            <p className="text-xs text-muted-foreground">Ready to chat</p>
                        </CardContent>
                    </Card>
                </div>

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>Installation Instructions</CardTitle>
                        <CardDescription>Follow these steps to install the SkillHive Productivity Extension</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">1</div>
                            <div>
                                <h3 className="font-semibold mb-1">Download and Extract</h3>
                                <p className="text-sm text-muted-foreground">Click the download button above to get the extension files. Extract the zip file to a folder on your computer.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">2</div>
                            <div>
                                <h3 className="font-semibold mb-1">Open Extensions Management</h3>
                                <p className="text-sm text-muted-foreground">Open Chrome/Edge and go to <code className="bg-muted px-1 rounded">chrome://extensions</code>. Enable "Developer mode" in the top right.</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4 p-4 bg-muted/50 rounded-lg">
                            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">3</div>
                            <div>
                                <h3 className="font-semibold mb-1">Load Unpacked</h3>
                                <p className="text-sm text-muted-foreground">Click "Load unpacked" and select the folder where you extracted the extension files.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </main>
        </div>
    );
}
