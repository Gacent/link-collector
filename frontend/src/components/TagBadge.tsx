interface TagBadgeProps {
  name: string;
  onClick?: () => void;
  active?: boolean;
  variant?: 'default' | 'coral' | 'teal' | 'amber';
}

export default function TagBadge({ 
  name, 
  onClick, 
  active = false, 
  variant = 'default' 
}: TagBadgeProps) {
  // Claude design system badge styles with proper dark mode variants
  const baseClasses = `
    inline-block text-[12px] font-sans font-medium
    px-2.5 py-1 rounded-[var(--radius-pill)] cursor-pointer transition-all duration-200
    btn-press select-none
  `;

  const variants = {
    default: `bg-[var(--color-surface-soft)] dark:bg-[var(--color-surface-dark-soft)]
      text-[var(--color-muted)] dark:text-[var(--color-on-dark-soft)]
      border border-[var(--color-hairline)] dark:border-[var(--color-surface-dark-elevated)]
      hover:border-[var(--color-primary)]/50 hover:text-[var(--color-primary)]`,
    coral: `bg-[var(--color-primary)]/10 dark:bg-[var(--color-primary)]/20 
      text-[var(--color-primary)] dark:text-[var(--color-on-dark)] 
      border border-[var(--color-primary)] dark:border-[var(--color-primary)]`,
    teal: `bg-[var(--color-accent-teal)]/15 dark:bg-[var(--color-accent-teal)]/20 
      text-[var(--color-accent-teal)] dark:text-[var(--color-on-dark)] 
      border border-[var(--color-accent-teal)]/30 dark:border-[var(--color-accent-teal)]/40`,
    amber: `bg-[var(--color-accent-amber)]/15 dark:bg-[var(--color-accent-amber)]/20 
      text-[var(--color-accent-amber)] dark:text-[var(--color-on-dark)] 
      border border-[var(--color-accent-amber)]/30 dark:border-[var(--color-accent-amber)]/40`,
  };

  const activeRing = active ? 'ring-2 ring-[var(--color-primary)] ring-offset-2 dark:ring-offset-[var(--color-surface-dark)]' : '';

  return (
    <span
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${activeRing}`}
      role="button"
      aria-pressed={active}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {name}
    </span>
  );
}