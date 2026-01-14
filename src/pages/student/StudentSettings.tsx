import { useState, useEffect } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { useAuth } from '@/contexts/AuthContext';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/components/ui/use-toast';

const notificationKeys = [
  'studyReminders',
  'quizAlerts',
  'fatigueAlerts',
  'jobRecs',
  'newVideos',
  'chatbotUpdates',
  'systemAnnouncements',
] as const;

export default function StudentSettings() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const [account, setAccount] = useState({
    email: user?.email ?? 'student@example.com',
    phone: '+1 (555) 123-4567',
    password: '',
    linkedGoogle: true,
  });

  const [notifications, setNotifications] = useState<Record<(typeof notificationKeys)[number], boolean>>({
    studyReminders: true,
    quizAlerts: true,
    fatigueAlerts: false,
    jobRecs: true,
    newVideos: true,
    chatbotUpdates: true,
    systemAnnouncements: true,
  });

  const [privacy, setPrivacy] = useState({
    twoStep: true,
    visibility: 'mentor',
    downloadData: '',
  });

  const [theme, setTheme] = useState({
    mode: 'system',
    accent: 'blue',
    animations: true,
  });

  const [learning, setLearning] = useState({
    format: 'videos',
    difficulty: 'normal',
    dailyTime: '2h',
    quizMode: 'adaptive',
    aiExplain: 'detailed',
  });

  const [chatbot, setChatbot] = useState({
    enabled: true,
    useLearningData: true,
    tone: 'teacher',
  });

  /* Extension Settings State */
  const [extensionDetected, setExtensionDetected] = useState(false);
  const [alertSettings, setAlertSettings] = useState({
    enabled: true,
    interval: '5', // minutes
  });

  useEffect(() => {
    // Check for extension via postMessage (same as Dashboard)
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== window) return;

      if (event.data.type === 'SKILLHIVE_EXTENSION_DATA') {
        console.log('Settings: Extension Detected');
        setExtensionDetected(true);
      }
    };

    window.addEventListener('message', handleMessage);

    // Poll for extension
    const checkExtension = () => {
      window.postMessage({ type: 'REQUEST_EXTENSION_DATA' }, '*');
    };

    checkExtension();
    const interval = setInterval(checkExtension, 2000);

    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(interval);
    };
  }, []);

  const handleAlertSettingChange = (key: keyof typeof alertSettings, value: string | boolean) => {
    const newSettings = { ...alertSettings, [key]: value };
    setAlertSettings(newSettings);

    // Send to Extension via CustomEvent
    document.dispatchEvent(new CustomEvent('SKILLHIVE_EXTENSION_SETTINGS', {
      detail: newSettings
    }));

    toast({
      title: "Extension Settings Updated",
      description: `Distraction alerts set to every ${newSettings.interval} minutes.`
    });
  };

  const [jobs, setJobs] = useState({
    locations: 'Global / Remote first',
    roles: 'ML Engineer, Data Scientist',
    preference: 'Full-time',
    salary: '₹12L - ₹20L',
    workType: 'Hybrid',
  });

  const handleAccountSave = () => {
    toast({
      title: 'Account updated',
      description: 'Credentials refreshed successfully.',
    });
  };

  const handleNotificationToggle = (key: (typeof notificationKeys)[number]) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleThemeChange = (key: keyof typeof theme, value: string | boolean) => {
    setTheme((prev) => ({ ...prev, [key]: value }));
  };

  const handleLearningChange = (key: keyof typeof learning, value: string) => {
    setLearning((prev) => ({ ...prev, [key]: value }));
  };

  const handleChatbotChange = (key: keyof typeof chatbot, value: string | boolean) => {
    setChatbot((prev) => ({ ...prev, [key]: value }));
  };

  const handleJobsChange = (key: keyof typeof jobs, value: string) => {
    setJobs((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">⚙️ Settings Control Room</p>
          <h1 className="text-3xl font-semibold text-foreground">Fine-tune your adaptive learning experience</h1>
          <p className="text-muted-foreground">
            Manage privacy, notifications, UI preferences, learning modes, chatbot behavior, and job recommendations from one place.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Identity, credentials, and linked accounts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email address</Label>
                <Input value={account.email} onChange={(e) => setAccount({ ...account, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone number</Label>
                <Input value={account.phone} onChange={(e) => setAccount({ ...account, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Update password</Label>
                <Input type="password" placeholder="New password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Linked Google account</p>
                  <p className="text-xs text-muted-foreground">{account.linkedGoogle ? 'Connected via OAuth' : 'Not connected'}</p>
                </div>
                <Switch checked={account.linkedGoogle} onCheckedChange={(checked) => setAccount({ ...account, linkedGoogle: checked })} />
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleAccountSave}>Save account</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">Delete account</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete account?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. All learning history, jobs, and achievements will be removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete account
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Toggle alerts that matter to you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {notificationKeys.map((key) => (
                <div key={key} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium capitalize">{key.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="text-xs text-muted-foreground">
                      {key === 'studyReminders' && 'Stay on top of planned study blocks'}
                      {key === 'quizAlerts' && 'Know when adaptive quizzes unlock'}
                      {key === 'fatigueAlerts' && 'Adaptive fatigue + burnout signals'}
                      {key === 'jobRecs' && 'New roles tailored to your skill graph'}
                      {key === 'newVideos' && 'Fresh lecture drops in your playlists'}
                      {key === 'chatbotUpdates' && 'Chatbot pushes + new AI helpers'}
                      {key === 'systemAnnouncements' && 'Platform notices & planned downtime'}
                    </p>
                  </div>
                  <Switch checked={notifications[key]} onCheckedChange={() => handleNotificationToggle(key)} />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Privacy & Security</CardTitle>
              <CardDescription>Control visibility and data portability</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Two-step login</p>
                  <p className="text-xs text-muted-foreground">Adds OTP verification for every login</p>
                </div>
                <Switch checked={privacy.twoStep} onCheckedChange={(checked) => setPrivacy({ ...privacy, twoStep: checked })} />
              </div>
              <div className="space-y-2">
                <Label>Profile visibility</Label>
                <Select value={privacy.visibility} onValueChange={(value) => setPrivacy({ ...privacy, visibility: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Who can view?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mentor">Mentors only</SelectItem>
                    <SelectItem value="all">Anyone in cohort</SelectItem>
                    <SelectItem value="private">Only me</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Download profile data</Label>
                <Textarea rows={2} placeholder="Optional note for export request" value={privacy.downloadData} onChange={(e) => setPrivacy({ ...privacy, downloadData: e.target.value })} />
                <Button variant="outline" size="sm">
                  Generate export
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button variant="secondary">Clear activity logs</Button>
                <Button variant="outline">Manage saved data</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>UI & Theme</CardTitle>
              <CardDescription>Match the platform vibe to your focus state</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Mode</Label>
                <Select value={theme.mode} onValueChange={(value) => handleThemeChange('mode', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                    <SelectItem value="system">System auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Accent color</Label>
                <Select value={theme.accent} onValueChange={(value) => handleThemeChange('accent', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select accent" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="purple">Purple</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Enable micro-animations</p>
                  <p className="text-xs text-muted-foreground">Smooth transitions + focus cues</p>
                </div>
                <Switch checked={theme.animations} onCheckedChange={(checked) => handleThemeChange('animations', checked)} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Learning Preferences</CardTitle>
              <CardDescription>Tell the platform how you like to learn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred format</Label>
                <Select value={learning.format} onValueChange={(value) => handleLearningChange('format', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select format" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="videos">Videos</SelectItem>
                    <SelectItem value="notes">Notes</SelectItem>
                    <SelectItem value="podcasts">Podcasts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Difficulty preference</Label>
                <Select value={learning.difficulty} onValueChange={(value) => handleLearningChange('difficulty', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Daily study target</Label>
                <Input value={learning.dailyTime} onChange={(e) => handleLearningChange('dailyTime', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Quiz mode</Label>
                <Select value={learning.quizMode} onValueChange={(value) => handleLearningChange('quizMode', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="adaptive">Adaptive</SelectItem>
                    <SelectItem value="timed">Timed</SelectItem>
                    <SelectItem value="practice">Practice</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>AI explanations</Label>
                <Select value={learning.aiExplain} onValueChange={(value) => handleLearningChange('aiExplain', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Chatbot & Job Preferences</CardTitle>
              <CardDescription>Control assistant visibility and job signals</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Enable chatbot</p>
                  <p className="text-xs text-muted-foreground">Toggles conversational helper</p>
                </div>
                <Switch checked={chatbot.enabled} onCheckedChange={(checked) => handleChatbotChange('enabled', checked)} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Allow learning data</p>
                  <p className="text-xs text-muted-foreground">Lets chatbot personalize answers</p>
                </div>
                <Switch checked={chatbot.useLearningData} onCheckedChange={(checked) => handleChatbotChange('useLearningData', checked)} />
              </div>
              <div className="space-y-2">
                <Label>Chatbot tone</Label>
                <Select value={chatbot.tone} onValueChange={(value) => handleChatbotChange('tone', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="formal">Formal</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="teacher">Teacher-like</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>Preferred job locations</Label>
                <Input value={jobs.locations} onChange={(e) => handleJobsChange('locations', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Preferred roles</Label>
                <Input value={jobs.roles} onChange={(e) => handleJobsChange('roles', e.target.value)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Internship / Full-time</Label>
                  <Select value={jobs.preference} onValueChange={(value) => handleJobsChange('preference', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select preference" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Internship">Internship</SelectItem>
                      <SelectItem value="Full-time">Full-time</SelectItem>
                      <SelectItem value="Both">Both</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Salary range</Label>
                  <Input value={jobs.salary} onChange={(e) => handleJobsChange('salary', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Work type</Label>
                <Select value={jobs.workType} onValueChange={(value) => handleJobsChange('workType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remote">Remote</SelectItem>
                    <SelectItem value="Hybrid">Hybrid</SelectItem>
                    <SelectItem value="On-site">On-site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-1">
          <Card className={`border-blue-500/20 bg-blue-50/10 dark:bg-blue-900/10 ${!extensionDetected ? 'opacity-80' : ''}`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Extension Settings
                {extensionDetected ? (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</span>
                ) : (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Not Detected</span>
                )}
              </CardTitle>
              <CardDescription>Configure how the browser extension interacts with you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!extensionDetected && (
                <Alert className="bg-yellow-50 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-300 dark:border-yellow-800/50 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Extension not responding?</AlertTitle>
                  <AlertDescription>
                    If you recently reloaded the extension, please <strong>refresh this page</strong> to reconnect.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Distraction Alerts</p>
                  <p className="text-xs text-muted-foreground">Get notified when you spend too much time on distracting sites</p>
                </div>
                <Switch checked={alertSettings.enabled} onCheckedChange={(checked) => handleAlertSettingChange('enabled', checked)} disabled={!extensionDetected} />
              </div>

              {alertSettings.enabled && (
                <div className="space-y-2">
                  <Label>Alert Frequency</Label>
                  <Select value={alertSettings.interval} onValueChange={(value) => handleAlertSettingChange('interval', value)} disabled={!extensionDetected}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Every 1 minute (Strict)</SelectItem>
                      <SelectItem value="3">Every 3 minutes</SelectItem>
                      <SelectItem value="5">Every 5 minutes</SelectItem>
                      <SelectItem value="10">Every 10 minutes</SelectItem>
                      <SelectItem value="15">Every 15 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    You will receive a system notification every {alertSettings.interval} minutes while on a distraction site.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Logout</CardTitle>
            <CardDescription>Sign out when you’re done with this session</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">Safe logout ensures your adaptive data stays protected.</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline">Logout</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                  <AlertDialogDescription>This will end your current learning session.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={signOut}>Logout</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
