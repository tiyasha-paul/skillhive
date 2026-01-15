import { useState, useEffect } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Chrome, Activity, Brain, AlertCircle, Clock, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ActivityEntry {
    url: string;
    domain: string;
    category: 'Learning' | 'Distraction' | 'Mixed' | 'Neutral' | 'Unknown';
    duration: number; // seconds
    startTime: number;
}

interface Item {
    domain: string;
    duration: number;
    category: string;
}

export default function StudentExtension() {
    const [isConnected, setIsConnected] = useState(false);
    const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
    const [stats, setStats] = useState({
        learningTime: 0, // seconds
        distractionTime: 0, // seconds
        mixedTime: 0, // seconds
        focusScore: 0, // percentage
    });
    const [weeklyData, setWeeklyData] = useState<any[]>([]);
    const [topSites, setTopSites] = useState<Item[]>([]);
    const [topSitesToday, setTopSitesToday] = useState<Item[]>([]);

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
        const todayStart = new Date().setHours(0, 0, 0, 0);

        // 1. Today's Stats
        let learning = 0;
        let distraction = 0;
        let mixed = 0;

        log.forEach(entry => {
            if (entry.startTime >= todayStart) {
                if (entry.category === 'Learning') learning += entry.duration;
                if (entry.category === 'Distraction') distraction += entry.duration;
                if (entry.category === 'Mixed') mixed += entry.duration;
            }
        });

        const totalFocus = learning + distraction; // Mixed doesn't count against/for focus score?
        // Or should score be Learning / (Learning + Distraction + Mixed)?
        // User asked "mixed" to be categorized, likely neutral. Let's keep it out of the strict focus score for now.
        const score = totalFocus > 0 ? Math.round((learning / totalFocus) * 100) : 0;

        setStats({
            learningTime: learning,
            distractionTime: distraction,
            mixedTime: mixed,
            focusScore: score
        });

        // 2. Weekly Data (Last 7 Days)
        const days = 7;
        const history: Record<string, { name: string, Learning: number, Distraction: number, Mixed: number }> = {};

        // Initialize last 7 days
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toDateString();
            const name = d.toLocaleDateString('en-US', { weekday: 'short' });
            history[key] = { name, Learning: 0, Distraction: 0, Mixed: 0 };
        }

        log.forEach(entry => {
            const dateKey = new Date(entry.startTime).toDateString();
            if (history[dateKey]) {
                if (entry.category === 'Learning') {
                    history[dateKey].Learning += (entry.duration / 60);
                } else if (entry.category === 'Distraction') {
                    history[dateKey].Distraction += (entry.duration / 60);
                } else if (entry.category === 'Mixed') {
                    history[dateKey].Mixed += (entry.duration / 60);
                }
            }
        });

        setWeeklyData(Object.values(history));

        // 3. Top Sites (Last 7 Days)
        const siteMap: Record<string, { duration: number, category: string }> = {};
        const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);

        log.forEach(entry => {
            if (entry.startTime >= sevenDaysAgo) {
                if (!siteMap[entry.domain]) {
                    siteMap[entry.domain] = { duration: 0, category: entry.category };
                }
                siteMap[entry.domain].duration += entry.duration;

                // Prioritize specific categories over Neutral if mixed data occurs
                if (entry.category !== 'Neutral' && entry.category !== 'Unknown') {
                    // If existing is Neutral/Unknown, upgrade it
                    if (siteMap[entry.domain].category === 'Neutral' || siteMap[entry.domain].category === 'Unknown') {
                        siteMap[entry.domain].category = entry.category;
                    }
                    // If explicitly Diff, maybe default to Mixed? For now keep first non-neutral.
                }
            }
        });

        // 4. Top Sites (Today)
        const siteMapToday: Record<string, { duration: number, category: string }> = {};
        log.forEach(entry => {
            if (entry.startTime >= todayStart) {
                if (!siteMapToday[entry.domain]) {
                    siteMapToday[entry.domain] = { duration: 0, category: entry.category };
                }
                siteMapToday[entry.domain].duration += entry.duration;
                if (entry.category !== 'Neutral' && entry.category !== 'Unknown') {
                    if (siteMapToday[entry.domain].category === 'Neutral' || siteMapToday[entry.domain].category === 'Unknown') {
                        siteMapToday[entry.domain].category = entry.category;
                    }
                }
            }
        });

        const sortedSites = Object.entries(siteMap)
            .map(([domain, data]) => ({ domain, ...data }))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10); // Top 10

        const sortedSitesToday = Object.entries(siteMapToday)
            .map(([domain, data]) => ({ domain, ...data }))
            .sort((a, b) => b.duration - a.duration)
            .slice(0, 10); // Top 10 Today

        setTopSites(sortedSites);
        setTopSitesToday(sortedSitesToday);
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

                    <div className="flex gap-2">
                        {isConnected && (
                            <Button
                                size="lg"
                                className="gap-2"
                                onClick={() => {
                                    const topSitesSummary = topSites.slice(0, 5).map(s => `- ${s.domain} (${formatDuration(s.duration)}, ${s.category})`).join('\n');
                                    const topSitesTodaySummary = topSitesToday.slice(0, 5).map(s => `- ${s.domain} (${formatDuration(s.duration)}, ${s.category})`).join('\n');

                                    const context = `Here is my productivity data for today from the extension:
- Focus Score: ${stats.focusScore}%
- Study Time: ${formatDuration(stats.learningTime)}
- Distracted Time: ${formatDuration(stats.distractionTime)}
- Mixed Time: ${formatDuration(stats.mixedTime)}

Top Visited Sites (Today):
${topSitesTodaySummary}

Top Visited Sites (Last 7 Days):
${topSitesSummary}

Can you help me improve my focus based on this?`;

                                    window.dispatchEvent(new CustomEvent('open-chatbot-with-context', {
                                        detail: { context }
                                    }));
                                }}
                            >
                                <MessageSquare className="w-5 h-5" />
                                Ask Study Coach
                            </Button>
                        )}
                        <Button size="lg" className="gap-2" onClick={() => window.open('/extension.zip', '_blank')}>
                            <Chrome className="w-5 h-5" />
                            Download Extension
                        </Button>
                    </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{isConnected ? formatDuration(stats.learningTime) : '--'}</div>
                            <p className="text-xs text-muted-foreground">Today's Total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Distracted Time</CardTitle>
                            <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{isConnected ? formatDuration(stats.distractionTime) : '--'}</div>
                            <p className="text-xs text-muted-foreground">Today's Total</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Mixed Time</CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{isConnected ? formatDuration(stats.mixedTime) : '--'}</div>
                            <p className="text-xs text-muted-foreground">Today's Total</p>
                        </CardContent>
                    </Card>
                </div>

                {isConnected && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                        {/* Weekly Chart */}
                        <Card className="lg:col-span-2">
                            <CardHeader>
                                <CardTitle>Weekly Activity</CardTitle>
                                <CardDescription>Your learning vs. distraction vs. mixed time (last 7 days).</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={weeklyData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="name" />
                                            <YAxis unit="m" />
                                            <Tooltip formatter={(value: number) => [`${Math.round(value)} mins`, 'Duration']} />
                                            <Legend />
                                            <Bar dataKey="Learning" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="Mixed" stackId="a" fill="#eab308" radius={[0, 0, 0, 0]} />
                                            <Bar dataKey="Distraction" stackId="a" fill="#ef4444" radius={[4, 4, 4, 4]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Top Sites */}
                        <Card className="lg:col-span-1">
                            <CardHeader>
                                <CardTitle>Top Sites</CardTitle>
                                <CardDescription>Most visited domains.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="today" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 mb-4">
                                        <TabsTrigger value="today">Today</TabsTrigger>
                                        <TabsTrigger value="week">Week</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="today">
                                        <ScrollArea className="h-[300px] pr-4">
                                            <div className="space-y-4">
                                                {topSitesToday.map((site, index) => (
                                                    <div key={site.domain} className="flex items-center justify-between">
                                                        <div className="flex items-start gap-2">
                                                            <div className="flex bg-muted h-9 w-9 items-center justify-center rounded-sm border shrink-0">
                                                                <img
                                                                    src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=64`}
                                                                    alt=""
                                                                    className="h-5 w-5 opacity-80"
                                                                    onError={(e) => (e.currentTarget.src = "")}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium leading-none truncate max-w-[120px]">{site.domain}</p>
                                                                <p className="text-xs text-muted-foreground mt-1 capitalize">{site.category}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-sm font-semibold ${site.category === 'Learning' ? 'text-green-600' :
                                                                site.category === 'Distraction' ? 'text-red-500' :
                                                                    site.category === 'Mixed' ? 'text-yellow-600' : 'text-foreground'
                                                                }`}>
                                                                {formatDuration(site.duration)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {topSitesToday.length === 0 && (
                                                    <div className="text-center text-muted-foreground py-8">
                                                        No data for today.
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>

                                    <TabsContent value="week">
                                        <ScrollArea className="h-[300px] pr-4">
                                            <div className="space-y-4">
                                                {topSites.map((site, index) => (
                                                    <div key={site.domain} className="flex items-center justify-between">
                                                        <div className="flex items-start gap-2">
                                                            <div className="flex bg-muted h-9 w-9 items-center justify-center rounded-sm border shrink-0">
                                                                <img
                                                                    src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=64`}
                                                                    alt=""
                                                                    className="h-5 w-5 opacity-80"
                                                                    onError={(e) => (e.currentTarget.src = "")}
                                                                />
                                                            </div>
                                                            <div>
                                                                <p className="text-sm font-medium leading-none truncate max-w-[120px]">{site.domain}</p>
                                                                <p className="text-xs text-muted-foreground mt-1 capitalize">{site.category}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`text-sm font-semibold ${site.category === 'Learning' ? 'text-green-600' :
                                                                site.category === 'Distraction' ? 'text-red-500' :
                                                                    site.category === 'Mixed' ? 'text-yellow-600' : 'text-foreground'
                                                                }`}>
                                                                {formatDuration(site.duration)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                                {topSites.length === 0 && (
                                                    <div className="text-center text-muted-foreground py-8">
                                                        No data for this week.
                                                    </div>
                                                )}
                                            </div>
                                        </ScrollArea>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                )}

                <Card className="mb-8">
                    <CardHeader>
                        <CardTitle>How this extension works?</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            This extension helps you stay focused by tracking your browser usage.
                        </p>
                        <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            <li><strong>Smart Tracking:</strong> It automatically categorizes websites into <strong>Learning</strong> (e.g., tutorials, courses), <strong>Distraction</strong> (e.g., social media), and <strong>Mixed</strong> (e.g., general YouTube).</li>
                            <li><strong>Distraction Alerts:</strong> You can set a time limit for distractions. If you exceed this limit, the extension will show you an alert to remind you to get back to work.</li>
                            <li><strong>Privacy First:</strong> Your browsing history is analyzed locally on your device.</li>
                        </ul>
                    </CardContent>
                </Card>

                {!isConnected && (
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
                )}
            </main>
        </div>
    );
}
