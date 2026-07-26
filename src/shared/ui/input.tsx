import * as React from 'react'

import { cn } from '@/shared/lib/cn'

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-9 w-full rounded-md border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]',
          className,
        )}
        {...props}
      />
    )
  },
)
