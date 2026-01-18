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
    intervalValue: '5',
    intervalUnit: 'minutes'
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
      description: `Distraction alerts set to every ${newSettings.intervalValue} ${newSettings.intervalUnit}.`
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
              <h1 className="text-3xl font-semibold text-foreground">Fine-tune your learning experience</h1>
              <p className="text-muted-foreground">
                Manage your account credentials, scheduled notifications, and browser extension preferences.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              if (confirm("Reset all local settings to default?")) resetSettings();
            }}>Reset to Default</Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
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

              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800">
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Manage your alerts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Timetable Notifications</p>
                    <p className="text-xs text-muted-foreground">
                      Get reminders for upcoming sessions and schedule changes
                    </p>
                  </div>
                  <Switch
                    checked={settings.notifications.timetableNotifications}
                    onCheckedChange={(checked) => updateSection('notifications', { timetableNotifications: checked })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className={`bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800 ${!extensionDetected ? 'opacity-80' : ''}`}>
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
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        value={alertSettings.intervalValue}
                        onChange={(e) => handleAlertSettingChange('intervalValue', e.target.value)}
                        disabled={!extensionDetected}
                        className="w-[120px]"
                      />
                      <Select
                        value={alertSettings.intervalUnit}
                        onValueChange={(value) => handleAlertSettingChange('intervalUnit', value)}
                        disabled={!extensionDetected}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="seconds">Seconds</SelectItem>
                          <SelectItem value="minutes">Minutes</SelectItem>
                          <SelectItem value="hours">Hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You will receive a system notification every {alertSettings.intervalValue} {alertSettings.intervalUnit} while on a distraction site.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>




      </main>
    </div>
  );
}
