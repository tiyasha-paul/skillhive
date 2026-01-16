import { Bell, User, GraduationCap, ChevronDown, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useState, useEffect } from 'react';
import { getUnreadCount, getNotifications, markAsRead, markAllAsRead, Notification } from '@/services/notifications';
import { SupportModal } from '@/components/SupportModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function StudentNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // loadNotifications stable via useCallback-like definition inside effect
  useEffect(() => {
    if (!user) return;

    const handleNotificationUpdate = () => {
      const allNotifications = getNotifications(user.id);
      setNotifications(allNotifications);
      setUnreadCount(getUnreadCount(user.id));
    };

    // Initial load
    handleNotificationUpdate();

    window.addEventListener('notification-created', handleNotificationUpdate as EventListener);
    window.addEventListener('notification-updated', handleNotificationUpdate as EventListener);
    window.addEventListener('refresh-notifications', handleNotificationUpdate as EventListener);

    return () => {
      window.removeEventListener('notification-created', handleNotificationUpdate as EventListener);
      window.removeEventListener('notification-updated', handleNotificationUpdate as EventListener);
      window.removeEventListener('refresh-notifications', handleNotificationUpdate as EventListener);
    };
  }, [user]);

  const loadNotifications = () => {
    if (!user) return;
    const allNotifications = getNotifications(user.id);
    setNotifications(allNotifications);
    setUnreadCount(getUnreadCount(user.id));
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!user) return;
    if (!notification.read && notification.id) {
      markAsRead(user.id, notification.id);
      // Update local state
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
      setUnreadCount(getUnreadCount(user.id));
    }
  };

  const handleMarkAllRead = () => {
    if (!user) return;
    markAllAsRead(user.id);
    loadNotifications();
  };

  const isActive = (path: string) => location.pathname === path;

  const navLinkClasses = (path: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${isActive(path)
      ? 'text-primary font-bold'
      : 'text-slate-600 dark:text-slate-300'
    }`;

  const NaviagtionItems = () => (
    <>
      <button onClick={() => navigate('/student/dashboard')} className={navLinkClasses('/student/dashboard')}>
        Dashboard
      </button>
      <button onClick={() => navigate('/student/learning')} className={navLinkClasses('/student/learning')}>
        Learning
      </button>
      <button onClick={() => navigate('/student/timetable')} className={navLinkClasses('/student/timetable')}>
        Timetable
      </button>
      <button onClick={() => navigate('/student/podcasts')} className={navLinkClasses('/student/podcasts')}>
        Podcasts
      </button>
      <button onClick={() => navigate('/student/extension')} className={navLinkClasses('/student/extension')}>
        Extension
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className={`flex items-center gap-1 ${navLinkClasses('/student/jobs')}`}>
            Jobs <ChevronDown className="h-4 w-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => navigate('/student/jobs')}>Browse Jobs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/student/jobs#saved')}>Saved Jobs</DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate('/student/jobs#resume')}>Resume Analysis</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );

  return (
    <nav className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-300">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Mobile Menu */}
          <div className="flex items-center gap-2">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] sm:w-[350px]">
                <div className="flex flex-col gap-6 mt-8">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                      <GraduationCap className="text-white" size={20} />
                    </div>
                    <span className="text-xl font-bold tracking-tight">SkillHive</span>
                  </div>
                  <div className="flex flex-col gap-4 items-start">
                    <NaviagtionItems />
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/student/dashboard')}>
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg">
                <GraduationCap className="text-white" size={20} />
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden md:block">SkillHive</span>
            </div>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6">
            <NaviagtionItems />
          </div>

          {/* Right: Theme Toggle, Notifications, Support, Profile */}
          <div className="flex items-center gap-2">
            <ThemeToggle />

            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-xs rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between p-2 border-b">
                  <h4 className="font-semibold text-sm">Notifications</h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={handleMarkAllRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
                <ScrollArea className="h-96">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">No notifications</div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`p-3 cursor-pointer hover:bg-accent transition-colors ${!notification.read ? 'bg-accent/50' : ''}`}
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{notification.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                              <p className="text-xs text-muted-foreground mt-1">{new Date(notification.created_at).toLocaleString()}</p>
                            </div>
                            {!notification.read && <div className="w-2 h-2 rounded-full bg-primary mt-1" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="hidden md:flex bg-green-600 hover:bg-green-700 text-white gap-2" size="sm">
                  Support <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSupportOpen(true)}>Contact Support</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/student/about')}>About</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/student/profile')}>Profile</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/student/settings')}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={signOut}>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <SupportModal open={supportOpen} onOpenChange={setSupportOpen} />
    </nav>
  );
}
