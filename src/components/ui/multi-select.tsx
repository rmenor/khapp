
'use client';

import { Check, ChevronsUpDown } from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from './scroll-area';

export type MultiSelectOption = {
  value: string;
  label: string;
};

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  className?: string;
  placeholder?: string;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  className,
  placeholder = 'Select options...',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleToggle = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter((item) => item !== value)
      : [...selected, value];
    onChange(newSelected);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between h-auto min-h-10', className)}
        >
            <div className="flex gap-1 flex-wrap">
            {selected.length > 0 ? (
                selected.map((value) => {
                const option = options.find((opt) => opt.value === value);
                return (
                    <Badge
                    variant="secondary"
                    key={value}
                    className="mr-1"
                    >
                    {option?.label || value}
                    </Badge>
                );
                })
            ) : (
                <span className="text-muted-foreground font-normal">{placeholder}</span>
            )}
            </div>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <ScrollArea className='h-72'>
            {options.map((option) => (
            <div
                key={option.value}
                className="flex items-center px-4 py-2 text-sm cursor-pointer hover:bg-accent"
                onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleToggle(option.value);
                  }}
            >
                <div
                    className={cn(
                    'mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                    selected.includes(option.value)
                        ? 'bg-primary text-primary-foreground'
                        : 'opacity-50 [&_svg]:invisible'
                    )}
                >
                    <Check className={cn('h-4 w-4')} />
                </div>
                {option.label}
            </div>
            ))}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
