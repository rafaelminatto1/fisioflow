import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { BreadcrumbItem, UserRole } from '../types';
import { IconChevronRight, IconBell } from './icons/IconComponents';
import NotificationDropdown from './NotificationDropdown';

const useClickOutside = (
  ref: React.RefObject<HTMLDivElement>,
  handler: () => void
) => {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

const Header: React.FC<{ breadcrumbs: BreadcrumbItem[] }> = ({
  breadcrumbs,
}) => {
  const { user } = useAuth();
  const { tasks, exerciseLogs } = useData();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

  const notificationCount = useMemo(() => {
    if (!user) return 0;

    let count = 0;
    const now = new Date();

    // Tasks for review (for mentors)
    if (user.role === UserRole.ADMIN || user.role === UserRole.FISIOTERAPEUTA) {
      count += tasks.filter((t) => t.status === 'review').length;
    }

    // New exercise logs from patients (for therapists)
    if (user.role !== UserRole.ESTAGIARIO) {
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      count += exerciseLogs.filter(
        (log) => new Date(log.date) > oneDayAgo
      ).length;
    }

    // Overdue tasks for the user
    count += tasks.filter(
      (t) =>
        t.assigneeId === user.id &&
        t.status !== 'done' &&
        t.dueDate &&
        new Date(t.dueDate) < now
    ).length;

    return count;
  }, [user, tasks, exerciseLogs]);

  return (
    <header className="flex flex-shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 py-3 md:px-6">
      <div className="hidden items-center text-sm md:flex">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center">
            <a
              href={crumb.href}
              className="text-slate-400 transition-colors hover:text-slate-200"
            >
              {crumb.name}
            </a>
            {index < breadcrumbs.length - 1 && (
              <IconChevronRight className="mx-1 h-4 w-4 text-slate-500" />
            )}
          </div>
        ))}
      </div>
      <div className="md:hidden">
        {/* Placeholder for mobile menu icon if needed in the future */}
      </div>
      <div className="flex items-center space-x-4">
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            className="relative text-slate-400 transition-colors hover:text-slate-100"
          >
            <IconBell />
            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
              </span>
            )}
          </button>
          {isDropdownOpen && (
            <NotificationDropdown
              closeDropdown={() => setIsDropdownOpen(false)}
            />
          )}
        </div>

        {user && (
          <div className="flex items-center">
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="mr-3 h-8 w-8 rounded-full"
            />
            <div className="hidden md:block">
              <p className="text-sm font-semibold text-slate-100">
                {user.name}
              </p>
              <p className="text-xs capitalize text-slate-400">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
