// Self-check for insights.js — run with: node src/logic/insights.check.js
// No test framework on purpose: one runnable check that fails if a rule breaks.
import assert from 'node:assert/strict'
import { generateInsights } from './insights.js'
import { addMonths, todayISO, toISODate } from '../lib/dates.js'

const cat = (id, over = {}) => [id, { id, name: id, icon: 'Tag', color: '#000', ...over }]
const categoryMap = new Map([cat('food', { icon: 'Utensils' }), cat('rent')])

// --- subscription detection: same amount+note across 3 distinct months -----
const subExpenses = [
  { date: '2026-05-05', amount: 15.9, category_id: 'food', notes: 'Netflix' },
  { date: '2026-06-05', amount: 15.9, category_id: 'food', notes: 'Netflix' },
  { date: '2026-07-05', amount: 15.9, category_id: 'food', notes: 'Netflix' },
]
const withSub = generateInsights({ expenses: subExpenses, incomes: [], fixedCosts: [], categoryMap, budgets: [] })
assert.ok(withSub.some((i) => i.id === 'subscriptions'), 'a 3-month recurring amount+note is flagged as a subscription')

const noSub = generateInsights({
  expenses: [
    { date: '2026-06-05', amount: 15.9, category_id: 'food', notes: 'Netflix' },
    { date: '2026-07-05', amount: 15.9, category_id: 'food', notes: 'Netflix' },
  ],
  incomes: [], fixedCosts: [], categoryMap, budgets: [],
})
assert.ok(!noSub.some((i) => i.id === 'subscriptions'), 'only 2 months does not count as a subscription yet')

// --- category trend: 3 consecutive rising months ----------------------------
// Must line up with insights.js's own window ([3,2,1,0] months back from
// today), so this stays correct no matter what day the check runs on.
const trendExpenses = [3, 2, 1, 0].map((i, idx) => ({
  date: `${toISODate(addMonths(todayISO(), -i)).slice(0, 7)}-10`,
  amount: 100 + idx * 40,
  category_id: 'food',
}))
const trendResult = generateInsights({ expenses: trendExpenses, incomes: [], fixedCosts: [], categoryMap, budgets: [] })
assert.ok(trendResult.some((i) => i.id === 'category-trend'), '4 rising months triggers the category-trend insight')

// --- fixed-cost ratio classification ----------------------------------------
const income = [{ date: new Date().toISOString().slice(0, 10), amount: 5000 }]
const highFixed = [{ id: 'rent', amount: 3200, period: 'monthly', active: true, payments: [] }]
const ratioResult = generateInsights({ expenses: [], incomes: income, fixedCosts: highFixed, categoryMap, budgets: [] })
const ratio = ratioResult.find((i) => i.id === 'fixed-ratio')
assert.ok(ratio, 'fixed-cost ratio insight fires when there is income')
assert.equal(ratio.level, 'danger', '3200/5000 = 64% must classify as danger (>=60%)')

// --- empty input never throws, always returns an array with the right shape -
const empty = generateInsights({ expenses: [], incomes: [], fixedCosts: [], categoryMap, budgets: [] })
assert.ok(Array.isArray(empty) && empty.length > 0, 'falls back to the all-good message instead of an empty list')
for (const i of empty) assert.ok(i.id && i.level && i.title, 'every insight has id/level/title')

console.log('insights: all checks passed')
