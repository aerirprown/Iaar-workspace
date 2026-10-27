export const CATEGORY_ICONS: Record<string, string> = {
  'image-gen': '\u{1F3A8}',
  'analytics': '\u{1F4CA}',
  'research': '\u{1F50D}',
  'lead-magnet': '\u{1F9F2}',
  'game': '\u{1F3AE}',
  'dev': '\u{1F6E0}\u{FE0F}',
  'book': '\u{1F4DA}',
  'app': '\u{1F4F1}',
  'website': '\u{1F310}',
}

// The types offered in a card's menu. Older categories keep their icons and
// stay selectable on cards that already use them.
export const PROJECT_TYPES = ['dev', 'book', 'game', 'app', 'website']

export function categoryIcon(category: string): string {
  return CATEGORY_ICONS[category] ?? '\u{1F4C1}'
}
