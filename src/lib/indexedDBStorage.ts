/**
 * IndexedDB utilities for persisting images and form state
 * Used to survive Android WebView activity recreation
 */

const DB_NAME = 'ProfileSetupDB';
const DB_VERSION = 1;
const STORE_NAME = 'images';

/**
 * Open IndexedDB database
 */
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
        console.log('📦 [IndexedDB] Object store created');
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = () => {
      console.error('📦 [IndexedDB] Error opening database:', request.error);
      reject(request.error);
    };
  });
};

/**
 * Save an image blob to IndexedDB
 */
export const saveImageToIndexedDB = async (key: string, blob: Blob): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const putRequest = store.put(blob, key);
      
      putRequest.onsuccess = () => {
        console.log('📦 [IndexedDB] Image saved:', key, 'size:', blob.size);
        resolve();
      };
      
      putRequest.onerror = () => {
        console.error('📦 [IndexedDB] Error saving image:', putRequest.error);
        reject(putRequest.error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('📦 [IndexedDB] saveImageToIndexedDB error:', error);
    // Don't throw - we want the app to continue even if IndexedDB fails
  }
};

/**
 * Load an image blob from IndexedDB
 */
export const loadImageFromIndexedDB = async (key: string): Promise<Blob | null> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve(null);
        return;
      }
      
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      
      const getRequest = store.get(key);
      
      getRequest.onsuccess = () => {
        const result = getRequest.result;
        if (result) {
          console.log('📦 [IndexedDB] Image loaded:', key, 'size:', result.size);
        } else {
          console.log('📦 [IndexedDB] No image found for key:', key);
        }
        resolve(result || null);
      };
      
      getRequest.onerror = () => {
        console.error('📦 [IndexedDB] Error loading image:', getRequest.error);
        reject(getRequest.error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('📦 [IndexedDB] loadImageFromIndexedDB error:', error);
    return null;
  }
};

/**
 * Delete an image from IndexedDB
 */
export const deleteImageFromIndexedDB = async (key: string): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve();
        return;
      }
      
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const deleteRequest = store.delete(key);
      
      deleteRequest.onsuccess = () => {
        console.log('📦 [IndexedDB] Image deleted:', key);
        resolve();
      };
      
      deleteRequest.onerror = () => {
        console.error('📦 [IndexedDB] Error deleting image:', deleteRequest.error);
        reject(deleteRequest.error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('📦 [IndexedDB] deleteImageFromIndexedDB error:', error);
  }
};

/**
 * Clear all images from IndexedDB
 */
export const clearAllImagesFromIndexedDB = async (): Promise<void> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.close();
        resolve();
        return;
      }
      
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        console.log('📦 [IndexedDB] All images cleared');
        resolve();
      };
      
      clearRequest.onerror = () => {
        console.error('📦 [IndexedDB] Error clearing images:', clearRequest.error);
        reject(clearRequest.error);
      };
      
      tx.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('📦 [IndexedDB] clearAllImagesFromIndexedDB error:', error);
  }
};
