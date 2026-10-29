import { getActiveCampusId, getAuthHeaders } from './api';

const API_URL = import.meta.env.VITE_API_URL || 'https://usl72lj2m5.execute-api.us-east-2.amazonaws.com';
const SESSION_KEY = 'faithhub_content_session_v1';

export type ContentType = 'EVENT' | 'BROADCAST' | 'DEVOTIONAL' | 'STUDY_BOOK' | 'STUDY_CHAPTER';
export type EngagementType = 'OPENED' | 'STARTED' | 'COMPLETED' | 'CTA_CLICKED' | 'NOTE_CREATED' | 'STREAM_STARTED' | 'STREAM_ENDED';

function identifier(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}_${Math.random().toString(36).slice(2, 14)}`;
}

function sessionId(): string {
  const current = localStorage.getItem(SESSION_KEY);
  if (current) return current;
  const created = identifier();
  localStorage.setItem(SESSION_KEY, created);
  return created;
}

export async function trackContentEngagement(input: {
  organizationId: string;
  contentType: ContentType;
  contentId: string;
  eventType: EngagementType;
  source?: string;
  durationSeconds?: number;
  progressPercent?: number;
}): Promise<void> {
  if (!input.organizationId || !input.contentId) return;
  try {
    const headers = await getAuthHeaders();
    await fetch(`${API_URL}/content/engagement`, {
      method: 'POST',
      headers,
      keepalive: true,
      body: JSON.stringify({
        organization_id: input.organizationId,
        campus_id: getActiveCampusId(),
        content_type: input.contentType,
        content_id: input.contentId,
        event_type: input.eventType,
        source: input.source || 'PWA',
        duration_seconds: input.durationSeconds,
        progress_percent: input.progressPercent,
        session_id: sessionId(),
        idempotency_key: identifier(),
        occurred_at: new Date().toISOString()
      })
    });
  } catch {
    // Telemetria nunca deve bloquear a jornada principal do membro.
  }
}
