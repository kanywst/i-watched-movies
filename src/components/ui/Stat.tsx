import React from 'react';
import { clsx } from 'clsx';

/**
 * The one figure-plus-caption tile used across the app: the header counters, the History
 * summary row and the Stats callouts were three separate implementations of the same
 * thing (`ActivityHeatmap.Stat`, `TastePanel.Callout`, and thirteen inline copies in
 * App.tsx). They differ only in type scale, alignment and whether an icon is shown, so
 * those are the props.
 */

/** `lg` is the lead figure of a header group, `md` its siblings, `sm` the in-panel tiles. */
export type StatSize = 'sm' | 'md' | 'lg';

const VALUE_SIZE: Record<StatSize, string> = {
  sm: 'text-2xl',
  md: 'text-3xl',
  lg: 'text-5xl',
};

export interface StatProps {
  /** Rendered as-is, so a caller can pass a pre-formatted string or a number. */
  value: React.ReactNode;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  size?: StatSize;
  /**
   * `end` right-aligns from the md breakpoint up, which is what the header groups need to
   * sit flush against the page edge. Panels stay `start`.
   */
  align?: 'start' | 'end';
  /** Small trailing unit, e.g. the `d` on a streak count. */
  suffix?: string;
}

export const Stat: React.FC<StatProps> = ({
  value,
  label,
  icon: Icon,
  size = 'sm',
  align = 'start',
  suffix,
}) => (
  <div className={clsx('flex flex-col gap-1', align === 'end' && 'items-start md:items-end')}>
    <div className="flex items-center gap-1.5 text-stone-800 dark:text-stone-200">
      {Icon && <Icon className="w-4 h-4 text-stone-400" />}
      <span className={clsx(VALUE_SIZE[size], 'font-light tabular-nums')}>
        {value}
        {suffix && <span className="text-base text-stone-400">{suffix}</span>}
      </span>
    </div>
    <div className="text-xs font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
      {label}
    </div>
  </div>
);
