export const STATUS_COLORS = {
  owned: {
    css: 'var(--primary)',
    bgClass: 'bg-primary',
  },
  onTheWay: {
    css: 'var(--accent-blue)',
    bgClass: 'bg-accent-blue',
  },
  wishlist: {
    css: 'var(--wishlist-red)',
    bgClass: 'bg-[var(--wishlist-red)]',
  },
  duplicates: {
    css: 'var(--secondary)',
    bgClass: 'bg-secondary',
  },
} as const;
