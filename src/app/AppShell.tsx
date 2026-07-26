import { NavLink, Outlet } from 'react-router-dom'
import { BookOpen, CalendarDays, EyeOff, Settings } from 'lucide-react'

import { cn } from '@/shared/lib/cn'

const tabs = [
  { to: '/', end: true, label: '오늘', icon: CalendarDays },
  { to: '/library', end: false, label: '서재', icon: BookOpen },
  { to: '/marks', end: false, label: '가림', icon: EyeOff },
  { to: '/more', end: false, label: '더보기', icon: Settings },
] as const

export function AppShell() {
  return (
    <div className="flex h-full flex-col bg-[var(--bg)] text-[var(--ink)]">
      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>
      <nav
        className="grid shrink-0 grid-cols-4 border-t-2 border-[var(--ink)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom)]"
        aria-label="주요 메뉴"
      >
        {tabs.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'touch-target flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium text-[var(--muted)]',
                isActive && 'font-bold text-[var(--ink)]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn('h-5 w-5', isActive && 'text-[var(--accent)]')}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
