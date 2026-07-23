// Suggest a category for a new expense from its description text, learned from
// the user's OWN history — no hardcoded keyword lists, no network. We tokenise
// past notes and remember which category each word tends to belong to; a new
// note is scored against that index and the best-matching category wins.

const STOP = new Set([
  'und', 'für', 'mit', 'der', 'die', 'das', 'den', 'dem', 'ein', 'eine',
  'chf', 'von', 'the', 'and', 'div', 'inkl',
])

/** Lowercase, strip punctuation, keep tokens of length ≥ 3 that aren't stopwords. */
function tokens(s) {
  return (s || '')
    .toLowerCase()
    .replace(/[^a-z0-9äöüàéèç ]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOP.has(t))
}

/** Build token → Map(categoryId → count) from past expenses with a note. */
export function buildCategoryIndex(expenses) {
  const index = new Map()
  for (const e of expenses || []) {
    if (!e.category_id || !e.notes) continue
    for (const t of new Set(tokens(e.notes))) {
      let byCat = index.get(t)
      if (!byCat) { byCat = new Map(); index.set(t, byCat) }
      byCat.set(e.category_id, (byCat.get(e.category_id) || 0) + 1)
    }
  }
  return index
}

/** Best-matching categoryId for `note` given a built index, or null if none. */
export function suggestCategory(note, index) {
  if (!index || index.size === 0) return null
  const scores = new Map()
  for (const t of new Set(tokens(note))) {
    const byCat = index.get(t)
    if (!byCat) continue
    for (const [catId, count] of byCat) scores.set(catId, (scores.get(catId) || 0) + count)
  }
  let best = null
  let bestScore = 0
  for (const [catId, score] of scores) {
    if (score > bestScore) { best = catId; bestScore = score }
  }
  return bestScore > 0 ? best : null
}
