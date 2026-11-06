import { recordUsage } from './usageTelemetry';

export type ContentType = 'EVENT' | 'BROADCAST' | 'DEVOTIONAL' | 'STUDY_BOOK' | 'STUDY_CHAPTER';
export type EngagementType = 'OPENED' | 'STARTED' | 'COMPLETED' | 'CTA_CLICKED' | 'NOTE_CREATED' | 'STREAM_STARTED' | 'STREAM_ENDED';

export async function trackContentEngagement(input: {
  organizationId: string;
  contentType: ContentType;
  contentId: string;
  eventType: EngagementType;
  source?: string;
  durationSeconds?: number;
  progressPercent?: number;
}): Promise<void> {
  recordUsage({name:'content_interaction', module: input.contentType==='EVENT'?'events':input.contentType==='DEVOTIONAL'?'devotionals':input.contentType==='BROADCAST'?'home':'cells',
    content_type:input.contentType, content_id:input.contentId,event_type:input.eventType,
    duration_seconds:input.durationSeconds,progress_percent:input.progressPercent},input.organizationId);
}
