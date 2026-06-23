// Monthly Financial Story
// Summarises the current month: top spending day, biggest saving day,
// category breakdown, unusual trends and overall performance.
import { isThisMonth, formatDate, parseISO, toISODate } from '../lib/dates'
import { categoryPieData } from './selectors'

export function monthlyStory({ expenses, incomes, categoryMap }) {
  const monthExpenses = (expenses || []).filter((e) => isThisMonth(e.date))
  const monthIncomes = (incomes || []).filter((i) => isThisMonth(i.date))

  const totalSpent = monthExpenses.reduce((a, e) => a + Number(e.amount), 0)
  const totalIncome = monthIncomes.reduce((a, i) => a + Number(i.amount), 0)
  const net = totalIncome - totalSpent

  // Spend per day -> top spending day.
  const perDay = new Map()
  for (const e of monthExpenses) {
    const d = String(e.date).slice(0, 10)
    perDay.set(d, (perDay.get(d) || 0) + Number(e.amount))
  }
  let topDay = null
  for (const [d, amt] of perDay.entries()) {
    if (!topDay || amt > topDay.amount) topDay = { date: d, amount: amt }
  }

  // "Biggest saving day": the day with the largest positive (income - spend).
  const incomePerDay = new Map()
  for (const i of monthIncomes) {
    const d = String(i.date).slice(0, 10)
    incomePerDay.set(d, (incomePerDay.get(d) || 0) + Number(i.amount))
  }
  const allDays = new Set([...perDay.keys(), ...incomePerDay.keys()])
  let bestSavingDay = null
  for (const d of allDays) {
    const delta = (incomePerDay.get(d) || 0) - (perDay.get(d) || 0)
    if (!bestSavingDay || delta > bestSavingDay.amount) bestSavingDay = { date: d, amount: delta }
  }
  // A "no-spend" day is also a good saving signal when there's no income data.
  let noSpendDays = 0
  if (monthExpenses.length) {
    const today = parseISO(toISODate(new Date()))
    const first = parseISO(toISODate(new Date(today.getFullYear(), today.getMonth(), 1)))
    for (let d = new Date(first); d <= today; d.setDate(d.getDate() + 1)) {
      if (!perDay.has(toISODate(d))) noSpendDays += 1
    }
  }

  const breakdown = categoryPieData(expenses, categoryMap, { monthOnly: true })
  const topCategory = breakdown[0] || null

  // Daily average + simple pace projection for the full month.
  const dayOfMonth = new Date().getDate()
  const dailyAvg = dayOfMonth ? totalSpent / dayOfMonth : 0
  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
  const projectedMonth = dailyAvg * daysInMonth

  return {
    totalSpent, totalIncome, net,
    topDay: topDay ? { ...topDay, label: formatDate(topDay.date) } : null,
    bestSavingDay:
      bestSavingDay && bestSavingDay.amount > 0
        ? { ...bestSavingDay, label: formatDate(bestSavingDay.date) }
        : null,
    noSpendDays,
    breakdown,
    topCategory,
    dailyAvg,
    projectedMonth,
    transactionCount: monthExpenses.length,
    savingsRate: totalIncome > 0 ? net / totalIncome : null,
  }
}
