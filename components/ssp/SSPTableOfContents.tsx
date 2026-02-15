'use client';

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface TOCItem {
  id: string;
  label: string;
  level: number;
  children?: TOCItem[];
}

interface SSPTableOfContentsProps {
  items: TOCItem[];
}

export function SSPTableOfContents({ items }: SSPTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: '-80px 0px -60% 0px',
        threshold: 0,
      }
    );

    const allIds = flattenIds(items);
    allIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className="sticky top-20 space-y-1 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 text-sm">
      <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">
        Table of Contents
      </p>
      {items.map((item) => (
        <TOCEntry
          key={item.id}
          item={item}
          activeId={activeId}
          onSelect={scrollTo}
        />
      ))}
    </nav>
  );
}

function TOCEntry({
  item,
  activeId,
  onSelect,
}: {
  item: TOCItem;
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const isActive = activeId === item.id;
  const hasActiveChild = item.children?.some(
    (c) => c.id === activeId || c.children?.some((gc) => gc.id === activeId)
  );
  const [expanded, setExpanded] = useState(hasActiveChild || false);

  useEffect(() => {
    if (hasActiveChild) setExpanded(true);
  }, [hasActiveChild]);

  return (
    <div>
      <button
        onClick={() => {
          onSelect(item.id);
          if (item.children) setExpanded(!expanded);
        }}
        className={cn(
          'flex items-center gap-1 w-full text-left py-1 px-2 rounded-md text-xs transition-colors hover:bg-muted',
          item.level === 0 && 'font-medium',
          item.level === 1 && 'pl-4',
          item.level === 2 && 'pl-6',
          isActive && 'bg-primary/10 text-primary font-medium',
          hasActiveChild && !isActive && 'text-primary/70'
        )}
      >
        {item.children && (
          <ChevronRight
            className={cn(
              'h-3 w-3 shrink-0 transition-transform',
              expanded && 'rotate-90'
            )}
          />
        )}
        <span className="truncate">{item.label}</span>
      </button>
      {expanded && item.children && (
        <div className="ml-1">
          {item.children.map((child) => (
            <TOCEntry
              key={child.id}
              item={child}
              activeId={activeId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function flattenIds(items: TOCItem[]): string[] {
  const ids: string[] = [];
  items.forEach((item) => {
    ids.push(item.id);
    if (item.children) {
      ids.push(...flattenIds(item.children));
    }
  });
  return ids;
}
