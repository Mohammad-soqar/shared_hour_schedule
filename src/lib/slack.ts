import { formatHuman } from './dates'

// Slack renders webhook text as mrkdwn: unescaped user input could ping
// @channel via <!channel> or spoof links via <url|label>.
function escapeSlackText(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
}

export function absenceMarkedMessage(name: string, date: string, reason: string): string {
  return `🚫 ${escapeSlackText(name)} won't be available ${formatHuman(date)} — ${escapeSlackText(reason)}`
}

export function absenceUpdatedMessage(name: string, date: string, reason: string): string {
  return `✏️ ${escapeSlackText(name)}'s absence on ${formatHuman(date)} updated — ${escapeSlackText(reason)}`
}

export function absenceCancelledMessage(name: string, date: string): string {
  return `✅ ${escapeSlackText(name)} is now available ${formatHuman(date)}`
}

export function dailyReminderMessage(absences: { name: string; reason: string }[]): string {
  if (absences.length === 0) return "⏰ Shared hour today — everyone's in!"
  const out = absences.map((a) => `${escapeSlackText(a.name)} (${escapeSlackText(a.reason)})`).join(', ')
  return `⏰ Shared hour today — out: ${out}`
}

export async function sendSlackMessage(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL
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
