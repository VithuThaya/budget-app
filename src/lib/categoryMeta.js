// Shared metadata for category icons + colors, and the default seed set.
import {
  Utensils, ShoppingCart, Car, Home, Plug, Clapperboard, HeartPulse,
  ShoppingBag, Plane, Gift, GraduationCap, Dumbbell, Coffee, PawPrint,
  Smartphone, Tag, Wallet, PiggyBank, Baby, Wrench,
} from 'lucide-react'

// Map of icon name -> Lucide component, used by the picker and cards.
export const ICONS = {
  Utensils, ShoppingCart, Car, Home, Plug, Clapperboard, HeartPulse,
  ShoppingBag, Plane, Gift, GraduationCap, Dumbbell, Coffee, PawPrint,
  Smartphone, Tag, Wallet, PiggyBank, Baby, Wrench,
}

export const ICON_NAMES = Object.keys(ICONS)

/** Resolve an icon name to a component, falling back to a neutral Tag. */
export function iconFor(name) {
  return ICONS[name] || Tag
}

// Curated swatch palette (good contrast on dark surfaces).
export const COLORS = [
  '#2563eb', '#0ea5e9', '#06b6d4', '#14b8a6', '#22c55e', '#84cc16',
  '#eab308', '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#d946ef',
  '#a855f7', '#8b5cf6', '#6366f1', '#64748b',
]

// Seeded for brand-new accounts so the app is usable immediately.
export const DEFAULT_CATEGORIES = [
  { name: 'Dining', icon: 'Utensils', color: '#f97316' },
  { name: 'Groceries', icon: 'ShoppingCart', color: '#22c55e' },
  { name: 'Transport', icon: 'Car', color: '#0ea5e9' },
  { name: 'Housing', icon: 'Home', color: '#8b5cf6' },
  { name: 'Utilities', icon: 'Plug', color: '#eab308' },
  { name: 'Entertainment', icon: 'Clapperboard', color: '#ec4899' },
  { name: 'Health', icon: 'HeartPulse', color: '#ef4444' },
  { name: 'Shopping', icon: 'ShoppingBag', color: '#06b6d4' },
  { name: 'Other', icon: 'Tag', color: '#64748b' },
]
