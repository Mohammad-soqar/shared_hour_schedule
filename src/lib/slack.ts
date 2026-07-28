import { formatHuman } from './dates'

// A person as they appear in Slack messages: a raw <@Uxxxx> token makes Slack
// ping them; without a known slack id we fall back to their display name.
export type Person = { name: string; slackId: string | null }

// Slack renders webhook text as mrkdwn: unescaped user input could ping
// @channel via <!channel> or spoof links via <url|label>.
function escapeSlackText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

function mention(person: Person): string {
  return person.slackId ? `<@${person.slackId}>` : escapeSlackText(person.name)
}

export function absenceMarkedMessage(person: Person, date: string, reason: string): string {
  return `🚫 ${mention(person)} won't be available ${formatHuman(date)} — ${escapeSlackText(reason)}`
}

export function absenceUpdatedMessage(person: Person, date: string, reason: string): string {
  return `✏️ ${mention(person)}'s absence on ${formatHuman(date)} updated — ${escapeSlackText(reason)}`
}

export function absenceCancelledMessage(person: Person, date: string): string {
  return `✅ ${mention(person)} is now available ${formatHuman(date)}`
}

export function dailyReminderMessage(absences: Array<Person & { reason: string }>): string {
  if (absences.length === 0) return "⏰ Shared hour today — everyone's in!"
  const out = absences.map((a) => `${mention(a)} (${escapeSlackText(a.reason)})`).join(', ')
  return `⏰ Shared hour today — out: ${out}`
}

export function signupMessage(person: Person, date: string, note: string, invited: Person[]): string {
  let message = `🙋 ${mention(person)} is in for the shared hour ${formatHuman(date)}`
  if (note) message += ` — ${escapeSlackText(note)}`
  if (invited.length > 0) {
    message += ` · asking ${invited.map(mention).join(', ')} to join`
  }
  return message
}

export function signupCancelledMessage(person: Person, date: string): string {
  return `✋ ${mention(person)} pulled out of ${formatHuman(date)}`
}

export function weekendReminderMessage(signups: Array<Person & { note: string }>): string {
  const who = signups
    .map((s) => (s.note ? `${mention(s)} (${escapeSlackText(s.note)})` : mention(s)))
    .join(', ')
  return `⏰ Weekend shared hour today — in: ${who}`
}

export async function sendSlackMessage(text: string): Promise<boolean> {
  // Strip BOM/zero-width characters that sneak in when the URL is pasted
  // into env managers — an invisible prefix makes fetch() reject the URL.
  const url = process.env.SLACK_WEBHOOK_URL?.replace(/[\uFEFF\u200B]/g, '').trim()
  if (!url) {
    console.error('SLACK_WEBHOOK_URL is not set; skipping Slack notification')
    return false
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
    if (!response.ok) {
      console.error('Slack webhook responded with non-OK status')
      return false
    }
    return true
  } catch (error) {
    console.error('Slack webhook request failed', error)
    return false
  }
}
