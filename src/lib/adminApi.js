import { supabase } from '@/lib/customSupabaseClient';

export async function callAdminApi(action, body = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) throw new Error("No active session");

  // Construct URL with action parameter
  const functionUrl = `admin-portal?action=${action}`;
  
  // Determine method
  // 'list' is usually GET, others like 'create', 'delete', 'get-secret' are POST
  const method = action === 'list' ? 'GET' : 'POST';

  const response = await supabase.functions.invoke(functionUrl, {
    body: method === 'POST' ? JSON.stringify(body) : undefined,
    method: method,
    headers: {
      Authorization: `Bearer ${session.access_token}`
    }
  });

  if (response.error) {
    // Try to parse the error message from the response body if available
    let errorMessage = response.error.message || "API Error";
    try {
        // Sometimes the error body is a stream or text, supabase client handles it but let's be safe
        if (response.error.context && response.error.context.json) {
            const jsonError = await response.error.context.json();
            if (jsonError.error) errorMessage = jsonError.error;
        }
    } catch (e) {
        // ignore parsing error
    }
    throw new Error(errorMessage);
  }
  
  return response.data;
}