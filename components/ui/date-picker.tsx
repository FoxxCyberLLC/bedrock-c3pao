"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  fromDate?: Date;
  toDate?: Date;
}

export function DatePicker({
  date,
  onSelect,
  disabled,
  placeholder = "Pick a date",
  className,
  buttonClassName,
  fromDate,
  toDate,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            buttonClassName
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={cn("w-auto p-0", className)} align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={disabled}
          fromDate={fromDate}
          toDate={toDate}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
