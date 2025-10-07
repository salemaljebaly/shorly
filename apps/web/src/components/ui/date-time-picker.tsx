'use client';

import * as React from 'react';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
}

export function DateTimePicker({ date, onDateChange }: DateTimePickerProps) {
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date);
  const [time, setTime] = React.useState<string>(date ? format(date, 'HH:mm') : '00:00');

  const handleDateSelect = (newDate: Date | undefined) => {
    if (!newDate) {
      setSelectedDate(undefined);
      onDateChange(undefined);
      return;
    }

    const [hours, minutes] = time.split(':').map(Number);
    newDate.setHours(hours, minutes);
    setSelectedDate(newDate);
    onDateChange(newDate);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value;
    setTime(newTime);

    if (selectedDate) {
      const [hours, minutes] = newTime.split(':').map(Number);
      const newDate = new Date(selectedDate);
      newDate.setHours(hours, minutes);
      setSelectedDate(newDate);
      onDateChange(newDate);
    }
  };

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              'flex-1 justify-start text-left font-normal',
              !selectedDate && 'text-muted-foreground'
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, 'PPP') : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            initialFocus
          />
        </PopoverContent>
      </Popover>
      <div className="relative w-32">
        <Clock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="time" value={time} onChange={handleTimeChange} className="pl-10" />
      </div>
    </div>
  );
}
