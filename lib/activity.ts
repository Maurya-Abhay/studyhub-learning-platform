import type { SupabaseClient } from '@supabase/supabase-js';
export async function logActivity(supabase: SupabaseClient, userId: string, eventType: string, entityType?: string, entityId?: string, metadata: Record<string, unknown> = {}) {
  await supabase.from('activity_logs').insert({ user_id: userId, event_type: eventType, entity_type: entityType ?? null, entity_id: entityId ?? null, metadata });
}
