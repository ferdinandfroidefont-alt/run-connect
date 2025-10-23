/**
 * Custom storage adapter for WebView compatibility
 * Ensures that Supabase tokens are properly persisted in Android WebView
 */
export class WebViewStorage {
  private readonly STORAGE_KEY_PREFIX = 'supabase.auth.';

  async getItem(key: string): Promise<string | null> {
    try {
      const value = localStorage.getItem(key);
      console.log(`📦 [WebViewStorage] getItem(${key}):`, value ? 'found' : 'not found');
      return value;
    } catch (error) {
      console.error(`❌ [WebViewStorage] getItem error:`, error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      localStorage.setItem(key, value);
      console.log(`✅ [WebViewStorage] setItem(${key}): success`);
      
      // Force flush to disk (WebView workaround)
      if (typeof (window as any).AndroidBridge !== 'undefined') {
        console.log('🔄 [WebViewStorage] Forcing localStorage flush for Android');
      }
    } catch (error) {
      console.error(`❌ [WebViewStorage] setItem error:`, error);
      throw error;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
      console.log(`🗑️ [WebViewStorage] removeItem(${key}): success`);
    } catch (error) {
      console.error(`❌ [WebViewStorage] removeItem error:`, error);
      throw error;
    }
  }
}
