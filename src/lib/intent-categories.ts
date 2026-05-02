// Mapping backend category keys → Italian display labels.
// Source: backend/app/core/categories.py V0_CATEGORIES (22 keys, closed list).
// V0.5+ refinement: backend endpoint /api/categories with localized labels
// removes need for client-side hardcoded mapping (see IDEAS_BACKLOG).

export interface CategoryOption {
  key: string
  labelIt: string
  group: string
}

export const CATEGORY_GROUPS = {
  electronics: 'Elettronica',
  fashion: 'Abbigliamento',
  home: 'Casa',
  hobby_sport: 'Hobby & Sport',
  tools: 'Strumenti',
  misc: 'Altro',
} as const

export const CATEGORIES: CategoryOption[] = [
  { key: 'electronics_laptops', labelIt: 'Computer portatili', group: 'electronics' },
  { key: 'electronics_phones', labelIt: 'Telefoni', group: 'electronics' },
  { key: 'electronics_audio', labelIt: 'Audio', group: 'electronics' },
  { key: 'electronics_gaming', labelIt: 'Gaming', group: 'electronics' },
  { key: 'electronics_components', labelIt: 'Componenti elettronici', group: 'electronics' },
  { key: 'fashion_clothing', labelIt: 'Abbigliamento', group: 'fashion' },
  { key: 'fashion_shoes', labelIt: 'Scarpe', group: 'fashion' },
  { key: 'fashion_accessories', labelIt: 'Accessori', group: 'fashion' },
  { key: 'fashion_bags', labelIt: 'Borse', group: 'fashion' },
  { key: 'home_furniture', labelIt: 'Arredamento', group: 'home' },
  { key: 'home_decor', labelIt: 'Decorazioni', group: 'home' },
  { key: 'home_appliances', labelIt: 'Elettrodomestici', group: 'home' },
  { key: 'home_kitchen', labelIt: 'Cucina', group: 'home' },
  { key: 'hobby_books', labelIt: 'Libri', group: 'hobby_sport' },
  { key: 'hobby_music_instruments', labelIt: 'Strumenti musicali', group: 'hobby_sport' },
  { key: 'hobby_collectibles', labelIt: 'Oggetti da collezione', group: 'hobby_sport' },
  { key: 'hobby_vinyls', labelIt: 'Vinili', group: 'hobby_sport' },
  { key: 'sport_bicycles', labelIt: 'Biciclette', group: 'hobby_sport' },
  { key: 'sport_equipment', labelIt: 'Attrezzatura sportiva', group: 'hobby_sport' },
  { key: 'tools_diy', labelIt: 'Bricolage', group: 'tools' },
  { key: 'tools_garden', labelIt: 'Giardinaggio', group: 'tools' },
  { key: 'misc_other', labelIt: 'Altro', group: 'misc' },
]

export function getCategoryLabel(key: string): string {
  const cat = CATEGORIES.find((c) => c.key === key)
  return cat?.labelIt ?? key
}

export function getCategoriesByGroup(): Record<string, CategoryOption[]> {
  return CATEGORIES.reduce<Record<string, CategoryOption[]>>((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = []
    acc[cat.group].push(cat)
    return acc
  }, {})
}
