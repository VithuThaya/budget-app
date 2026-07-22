// Monthly Financial Story
// Summarises the current month: top spending day, biggest saving day,
// category breakdown, unusual trends and overall performance.
import { isSameMonth, formatDate, parseISO, toISODate } from '../lib/dates'
import { categoryPieData } from './selectors'

export function monthlyStory({ expenses, incomes, categoryMap, ref = new Date() }) {
  const refDate = ref instanceof Date ? ref : parseISO(ref)
  const isCurrent = isSameMonth(toISODate(new Date()), refDate)
  const monthExpenses = (expenses || []).filter((e) => isSameMonth(e.date, refDate))
  const monthIncomes = (incomes || []).filter((i) => isSameMonth(i.date, refDate))

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
  // For a past month count the whole month; for the current month, up to today.
  const year = refDate.getFullYear()
  const month = refDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const lastDay = isCurrent ? new Date().getDate() : daysInMonth
  let noSpendDays = 0
  if (monthExpenses.length) {
    for (let day = 1; day <= lastDay; day++) {
      if (!perDay.has(toISODate(new Date(year, month, day)))) noSpendDays += 1
    }
  }

  const breakdown = categoryPieData(expenses, categoryMap, { monthOnly: true, ref: refDate })
  const topCategory = breakdown[0] || null

  // Daily average + pace projection. Projection only makes sense mid-month;
  // for a completed past month the "projection" is just the actual total.
  const dailyAvg = lastDay ? totalSpent / lastDay : 0
  const projectedMonth = isCurrent ? dailyAvg * daysInMonth : totalSpent

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
