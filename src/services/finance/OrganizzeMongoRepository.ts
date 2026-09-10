import { MongoConnection } from '../../infrastructure/database/MongoConnection'
import { lastNSaoPauloMonths, saoPauloDateString } from './saoPauloCalendar'

type PersistableTransaction = {
  description: string
  notes?: string
  category_id: number
  amount_cents: number
}

type MonthlySummaryEntry = {
  year: number
  month: number
  interest_cents: number | null
  food_spending_cents: number | null
}

type MonthlySummaryResponse = {
  data: MonthlySummaryEntry[]
}

export const ORGANIZZE_TRANSACTIONS_COLLECTION = 'organizze_transactions'
export const ORGANIZZE_MONTHLY_INTEREST_COLLECTION = 'organizze_monthly_interest'
export const ORGANIZZE_MONTHLY_FOOD_COLLECTION = 'organizze_monthly_food_spending'

type SnapshotDoc = {
  year: number
  month: number
  amount_cents: number
}

let indexesEnsured = false

export function resetOrganizzeMongoIndexesForTests(): void {
  indexesEnsured = false
}

async function ensureSnapshotIndexes(): Promise<void> {
  if (indexesEnsured) return
  const unique = { unique: true }
  await MongoConnection.getCollection(ORGANIZZE_MONTHLY_INTEREST_COLLECTION).createIndex(
    { year: 1, month: 1 },
    unique,
  )
  await MongoConnection.getCollection(ORGANIZZE_MONTHLY_FOOD_COLLECTION).createIndex(
    { year: 1, month: 1 },
    unique,
  )
  indexesEnsured = true
}

export async function insertOrganizzeTransaction(
  transaction: PersistableTransaction,
  now: Date = new Date(),
): Promise<{ id: unknown }> {
  const { description, notes, category_id, amount_cents } = transaction
  const result = await MongoConnection.getCollection(ORGANIZZE_TRANSACTIONS_COLLECTION).insertOne({
    description,
    notes: notes ?? null,
    category_id,
    amount_cents,
    date: saoPauloDateString(now),
    createdAt: now,
  })
  return { id: result.insertedId }
}

export async function upsertMonthlyInterest(payload: {
  amount_cents: number
  year: number
  month: number
}): Promise<void> {
  await ensureSnapshotIndexes()
  await MongoConnection.getCollection(ORGANIZZE_MONTHLY_INTEREST_COLLECTION).updateOne(
    { year: payload.year, month: payload.month },
    {
      $set: {
        amount_cents: payload.amount_cents,
        year: payload.year,
        month: payload.month,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  )
}

export async function upsertMonthlyFoodSpending(payload: {
  amount_cents: number
  year: number
  month: number
}): Promise<void> {
  await ensureSnapshotIndexes()
  await MongoConnection.getCollection(ORGANIZZE_MONTHLY_FOOD_COLLECTION).updateOne(
    { year: payload.year, month: payload.month },
    {
      $set: {
        amount_cents: payload.amount_cents,
        year: payload.year,
        month: payload.month,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  )
}

function monthKey(year: number, month: number): string {
  return `${year}-${month}`
}

function indexSnapshots(docs: SnapshotDoc[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const doc of docs) {
    map.set(monthKey(doc.year, doc.month), doc.amount_cents)
  }
  return map
}

async function loadSnapshots(collection: string, filter: Record<string, unknown>): Promise<SnapshotDoc[]> {
  const docs = await MongoConnection.getCollection(collection).find(filter).toArray()
  return docs as unknown as SnapshotDoc[]
}

export async function getMonthlySummaryFromMongo(
  year?: number,
  month?: number,
  now: Date = new Date(),
): Promise<MonthlySummaryResponse> {
  if (year !== undefined && month !== undefined) {
    const filter = { year, month }
    const [interestDocs, foodDocs] = await Promise.all([
      loadSnapshots(ORGANIZZE_MONTHLY_INTEREST_COLLECTION, filter),
      loadSnapshots(ORGANIZZE_MONTHLY_FOOD_COLLECTION, filter),
    ])
    const entry: MonthlySummaryEntry = {
      year,
      month,
      interest_cents: interestDocs[0]?.amount_cents ?? null,
      food_spending_cents: foodDocs[0]?.amount_cents ?? null,
    }
    return { data: [entry] }
  }

  const window = lastNSaoPauloMonths(6, now)
  const orFilter = { $or: window.map(w => ({ year: w.year, month: w.month })) }
  const [interestDocs, foodDocs] = await Promise.all([
    loadSnapshots(ORGANIZZE_MONTHLY_INTEREST_COLLECTION, orFilter),
    loadSnapshots(ORGANIZZE_MONTHLY_FOOD_COLLECTION, orFilter),
  ])
  const interestIdx = indexSnapshots(interestDocs)
  const foodIdx = indexSnapshots(foodDocs)
  const keys = new Set([...interestIdx.keys(), ...foodIdx.keys()])
  const data: MonthlySummaryEntry[] = window
    .filter(w => keys.has(monthKey(w.year, w.month)))
    .map(w => ({
      year: w.year,
      month: w.month,
      interest_cents: interestIdx.get(monthKey(w.year, w.month)) ?? null,
      food_spending_cents: foodIdx.get(monthKey(w.year, w.month)) ?? null,
    }))
  return { data }
}
