import { Bell, User, ChevronDown, Menu, X } from 'lucide-react';
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

  // Navigation items configuration
  const navItems = [
    { label: 'Dashboard', path: '/student/dashboard' },
    { label: 'Learning', path: '/student/learning' },
    { label: 'Timetable', path: '/student/timetable' },
    { label: 'Podcasts', path: '/student/podcasts' },
    { label: 'Extension', path: '/student/extension' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const getNavLinkClass = (path: string) =>
    `text-sm font-medium transition-colors hover:text-primary ${isActive(path)
      ? 'text-primary font-bold'
      : 'text-slate-600 dark:text-slate-300'
    }`;

  return (
    <nav className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b sticky top-0 z-50 transition-colors duration-300 supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-950/60">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left: Brand Logo & Mobile Menu */}
          <div className="flex items-center gap-4">
            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2">
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[280px] sm:w-[350px] p-0">
                  <ScrollArea className="h-full py-6">
                    <div className="flex items-center gap-2 px-6 mb-6">
                      <img src="/logo.png" alt="SkillHive" className="w-10 h-10 object-contain" />
                      <span className="text-xl font-bold tracking-tight">SkillHive</span>
                    </div>
                    <div className="flex flex-col gap-1 px-4">
                      {navItems.map((item) => (
                        <button
                          key={item.path}
                          onClick={() => {
                            navigate(item.path);
                            setMobileMenuOpen(false);
                          }}
                          className={`flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive(item.path)
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          {item.label}
                        </button>
                      ))}

                      <div className="px-4 py-2 mt-2">
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Career</h4>
                        <button
                          onClick={() => {
                            navigate('/student/jobs');
                            setMobileMenuOpen(false);
                          }}
                          className={`flex items-center w-full px-4 py-3 text-sm font-medium rounded-md transition-colors ${isActive('/student/jobs')
                            ? 'bg-primary/10 text-primary'
                            : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                        >
                          Jobs & Internships
                        </button>
                      </div>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>
            </div>

            {/* Desktop Logo */}
            <div
              className="flex items-center gap-2 cursor-pointer"
              onClick={() => navigate('/student/dashboard')}
            >
              <img src="/logo.png" alt="SkillHive" className="w-10 h-10 object-contain" />
              <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white hidden md:block">SkillHive</span>
            </div>
          </div>

          {/* Center: Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center gap-6">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={getNavLinkClass(item.path)}
              >
                {item.label}
              </button>
            ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`flex items-center gap-1 ${getNavLinkClass('/student/jobs')}`}>
                  Jobs <ChevronDown className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => navigate('/student/jobs')}>Browse Jobs</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/student/jobs#saved')}>Saved Jobs</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/student/jobs#resume')}>Resume Analysis</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
