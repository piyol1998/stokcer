import { supabase } from '@/lib/customSupabaseClient';

/**
 * Creates a notification log in the database.
 * @param {string} userId - The user's ID
 * @param {string} title - Notification title
 * @param {string} message - Notification message body
 * @param {string} type - 'success', 'info', 'warning', 'error'
 * @param {object} metadata - Additional structured data for the activity
 */
export async function logNotification(userId, title, message, type = 'info', metadata = {}) {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('notification_logs')
      .insert([{
        user_id: userId,
        title,
        message,
        type,
        metadata: metadata,
        is_read: false,
        created_at: new Date().toISOString()
      }]);

    if (error) {
      console.error('Failed to log notification:', error);
    }
  } catch (err) {
    console.error('Error logging notification:', err);
  }
}

export async function getUnreadNotificationsCount(userId) {
  if (!userId) return 0;
  
  const { count, error } = await supabase
    .from('notification_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) return 0;
  return count;
}

export async function getAllNotifications(userId) {
  if (!userId) return [];
  
  const { data, error } = await supabase
    .from('notification_logs')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50); 

  if (error) return [];
  return data;
}

export async function markAllNotificationsRead(userId) {
  if (!userId) return;

  await supabase
    .from('notification_logs')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
}