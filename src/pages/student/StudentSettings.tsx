import { useState, useEffect } from 'react';
import { StudentNavbar } from '@/components/StudentNavbar';
import { useAuth } from '@/contexts/AuthContext';
import { useStudentSettings } from '@/hooks/useStudentSettings';
import { supabase } from '@/integrations/supabase/client';
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
  const { settings, updateSection, resetSettings } = useStudentSettings();

  // Account state
  const [account, setAccount] = useState({
    email: user?.email ?? '',
    phone: '',
    countryCode: '+91',
    password: '',
    confirmPassword: '',
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

  const handleAccountSave = async () => {
    try {
      let updated = false;

      // 1. Password Update
      if (account.password) {
        if (account.password.length < 6) {
          toast({
            title: 'Error',
            description: 'Password must be at least 6 characters.',
            variant: "destructive"
          });
          return;
        }

        if (account.password !== account.confirmPassword) {
          toast({
            title: 'Error',
            description: 'Passwords do not match.',
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase.auth.updateUser({ password: account.password });
        if (error) throw error;
        updated = true;
        setAccount(prev => ({ ...prev, password: '', confirmPassword: '' })); // Clear on success
      }

      // 2. Phone Update (Local / Future DB)
      if (updated || account.phone) {
        toast({
          title: 'Account updated',
          description: updated ? 'Password changed successfully.' : 'Profile details saved locally.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const handleNotificationToggle = (key: (typeof notificationKeys)[number]) => {
    updateSection('notifications', { [key]: !settings.notifications[key] });
  };

  const handleLearningChange = (key: keyof typeof settings.learning, value: string) => {
    updateSection('learning', { [key]: value });
  };



  return (
    <div className="min-h-screen bg-background">
      <StudentNavbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <header className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm uppercase tracking-wide text-muted-foreground">⚙️ Settings Control Room</p>
              <h1 className="text-3xl font-semibold text-foreground">Fine-tune your adaptive learning experience</h1>
              <p className="text-muted-foreground">
                Manage privacy, notifications, learning modes, chatbot behavior, and job recommendations.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              if (confirm("Reset all local settings to default?")) resetSettings();
            }}>Reset Defaults</Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>Identity and credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Email address</Label>
                <Input value={account.email} readOnly className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Phone number</Label>
                <div className="flex gap-2">
                  <Select
                    value={account.countryCode}
                    onValueChange={(val) => setAccount({ ...account, countryCode: val })}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Code" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                      <SelectItem value="+91">🇮🇳 +91</SelectItem>
                      <SelectItem value="+61">🇦🇺 +61</SelectItem>
                      <SelectItem value="+81">🇯🇵 +81</SelectItem>
                      <SelectItem value="+49">🇩🇪 +49</SelectItem>
                      <SelectItem value="+33">🇫🇷 +33</SelectItem>
                      <SelectItem value="+86">🇨🇳 +86</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    className="flex-1"
                    value={account.phone}
                    placeholder=""
                    onChange={(e) => setAccount({ ...account, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Update password</Label>
                <Input type="password" placeholder="New password" value={account.password} onChange={(e) => setAccount({ ...account, password: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input type="password" placeholder="Re-enter new password" value={account.confirmPassword} onChange={(e) => setAccount({ ...account, confirmPassword: e.target.value })} />
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
                  <Switch
                    checked={settings.notifications[key]}
                    onCheckedChange={(checked) => handleNotificationToggle(key)}
                  />
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
                <Switch
                  checked={settings.privacy.twoStep}
                  onCheckedChange={(checked) => updateSection('privacy', { twoStep: checked })}
                />
              </div>
              <div className="space-y-2">
                <Label>Profile visibility</Label>
                <Select
                  value={settings.privacy.visibility}
                  onValueChange={(value: any) => updateSection('privacy', { visibility: value })}
                >
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
                <Textarea rows={2} placeholder="Optional note for export request" />
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
              <CardTitle>Learning Preferences</CardTitle>
              <CardDescription>Tell the platform how you like to learn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Preferred format</Label>
                <Select
                  value={settings.learning.format}
                  onValueChange={(value: any) => handleLearningChange('format', value)}
                >
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
                <Select
                  value={settings.learning.difficulty}
                  onValueChange={(value: any) => handleLearningChange('difficulty', value)}
                >
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
                <Input
                  value={settings.learning.dailyTime}
                  onChange={(e) => handleLearningChange('dailyTime', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Quiz mode</Label>
                <Select
                  value={settings.learning.quizMode}
                  onValueChange={(value: any) => handleLearningChange('quizMode', value)}
                >
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
                <Select
                  value={settings.learning.aiExplain}
                  onValueChange={(value: any) => handleLearningChange('aiExplain', value)}
                >
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
