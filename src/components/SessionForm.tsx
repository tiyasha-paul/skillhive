import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import type { TimetableSession, DayOfWeek, Priority } from '@/services/timetable';
import { generateColorForSubject } from '@/services/timetable';

interface SessionFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (session: Omit<TimetableSession, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => Promise<void>;
  initialData?: TimetableSession | null;
}

export function SessionForm({ open, onClose, onSubmit, initialData }: SessionFormProps) {
  const [formData, setFormData] = useState({
    subject: '',
    topic: '',
    day: 'Monday' as DayOfWeek,
    start_time: '',
    end_time: '',
    priority: 'Medium' as Priority,
    notes: '',
    color: '',
  });

  const [selectByDate, setSelectByDate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    if (initialData) {
      setFormData({
        subject: initialData.subject || '',
        topic: initialData.topic || '',
        day: initialData.day,
        start_time: initialData.start_time,
        end_time: initialData.end_time,
        priority: initialData.priority,
        notes: initialData.notes || '',
        color: initialData.color || generateColorForSubject(initialData.subject),
      });
      if (initialData.date) {
        setSelectByDate(true);
        // initialData.date should be YYYY-MM-DD string
        // Parse it carefully to local date
        const parts = initialData.date.split('-');
        if (parts.length === 3) {
          const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          setSelectedDate(date);
        }
      } else {
        setSelectByDate(false);
        setSelectedDate(undefined);
      }
    } else {
      setFormData({
        subject: '',
        topic: '',
        day: 'Monday',
        start_time: '',
        end_time: '',
        priority: 'Medium',
        notes: '',
        color: '',
      });
      setSelectByDate(false);
      setSelectedDate(undefined);
    }
  }, [initialData, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.subject || !formData.start_time || !formData.end_time) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate time
    const [startHour, startMin] = formData.start_time.split(':').map(Number);
    const [endHour, endMin] = formData.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      alert('End time must be later than start time');
      return;
    }

    const color = formData.color || generateColorForSubject(formData.subject);

    // Format date if selected
    let dateStr: string | undefined = undefined;
    if (selectByDate && selectedDate) {
      // Create date string in YYYY-MM-DD format manually to avoid timezone shifts
      const offset = selectedDate.getTimezoneOffset();
      const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
      dateStr = localDate.toISOString().split('T')[0];
    } else if (!selectByDate) {
      dateStr = undefined; // Ensure date is cleared if toggle is off
    }

    await onSubmit({
      ...formData,
      color,
      date: dateStr,
    });

    onClose();
  };

  const daysOfWeek: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const priorities: Priority[] = ['High', 'Medium', 'Low'];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Session' : 'Add New Session'}</DialogTitle>
          <DialogDescription>
            Create or update your study session
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Data Structures"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                placeholder="e.g., Binary Trees"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="day">Day of Week *</Label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Select by Date</span>
                  <Switch
                    checked={selectByDate}
                    onCheckedChange={setSelectByDate}
                    className="scale-75"
                  />
                </div>
              </div>

              {selectByDate ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        if (date) {
                          const days: DayOfWeek[] = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                          const dayName = days[date.getDay()];
                          setFormData({ ...formData, day: dayName });
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              ) : (
                <Select
                  value={formData.day}
                  onValueChange={(value) => setFormData({ ...formData, day: value as DayOfWeek })}
                >
                  <SelectTrigger id="day">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {daysOfWeek.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectByDate && selectedDate && (
                <p className="text-xs text-muted-foreground">
                  This will add a recurring session every <span className="font-medium text-primary">{formData.day}</span>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Priority *</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value as Priority })}
              >
                <SelectTrigger id="priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((priority) => (
                    <SelectItem key={priority} value={priority}>
                      {priority}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_time">End Time *</Label>
              <Input
                id="end_time"
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <div className="flex items-center gap-2">
              <Input
                id="color"
                type="color"
                value={formData.color || generateColorForSubject(formData.subject)}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-20 h-10"
              />
              <Input
                type="text"
                value={formData.color || generateColorForSubject(formData.subject)}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                placeholder="#3B82F6"
                className="flex-1"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this session..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? 'Update Session' : 'Create Session'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

