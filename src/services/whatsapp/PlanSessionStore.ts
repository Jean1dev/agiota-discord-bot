export const STEPS = {
  NEW: 'new',
  AWAITING_ADDRESS: 'awaiting_address',
  ADDRESS_RECEIVED: 'address_received',
  AWAITING_PLAN_CHOICE: 'awaiting_plan_choice',
  AWAITING_EMAIL: 'awaiting_email',
} as const

export type Step = (typeof STEPS)[keyof typeof STEPS]

export interface PlanSession {
  step: Step
  contactInfo: Record<string, string>
  address: string | null
  latitude: number | null
  longitude: number | null
  plans: unknown | null
  createdAt: number
}

const sessions = new Map<string, PlanSession>()

export function getSession(jid: string): PlanSession | undefined {
  return sessions.get(jid)
}

export function getOrCreateSession(jid: string, contactInfo: Record<string, string> = {}): PlanSession {
  let session = sessions.get(jid)
  if (!session) {
    session = { step: STEPS.NEW, contactInfo: { ...contactInfo }, address: null, latitude: null, longitude: null, plans: null, createdAt: Date.now() }
    sessions.set(jid, session)
  }
  return session
}

export function updateSession(jid: string, update: Partial<PlanSession>): PlanSession | null {
  const session = sessions.get(jid)
  if (!session) return null
  Object.assign(session, update)
  return session
}

export function setStep(jid: string, step: Step): PlanSession | null {
  return updateSession(jid, { step })
}
