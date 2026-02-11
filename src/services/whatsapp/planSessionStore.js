const sessions = new Map()

const STEPS = {
  NEW: 'new',
  AWAITING_ADDRESS: 'awaiting_address',
  ADDRESS_RECEIVED: 'address_received',
  AWAITING_PLAN_CHOICE: 'awaiting_plan_choice',
  AWAITING_EMAIL: 'awaiting_email'
}

function getSession(jid) {
  return sessions.get(jid)
}

function getOrCreateSession(jid, contactInfo = {}) {
  let session = sessions.get(jid)
  if (!session) {
    session = {
      step: STEPS.NEW,
      contactInfo: { ...contactInfo },
      address: null,
      latitude: null,
      longitude: null,
      plans: null,
      createdAt: Date.now()
    }
    sessions.set(jid, session)
  }
  return session
}

function updateSession(jid, update) {
  const session = sessions.get(jid)
  if (!session) return null
  Object.assign(session, update)
  return session
}

function setStep(jid, step) {
  return updateSession(jid, { step })
}

module.exports = {
  getSession,
  getOrCreateSession,
  updateSession,
  setStep,
  STEPS
}
