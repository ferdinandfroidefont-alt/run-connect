/**
 * Instagram Stories sharing via official Meta "Sharing to Stories" API.
 *
 * iOS:  instagram-stories://share  + UIPasteboard  (background image + content_url)
 * Android: com.instagram.share.ADD_TO_STORY intent  (image URI + content_url extra)
 *
 * IMPORTANT — limitations Instagram (2025-2026):
 *  • content_url ajoute un lien d'attribution discret en bas de la story.
 *  • L'image entière n'est PAS cliquable (c'est une limite Meta, pas un bug).
 *  • Seul l'utilisateur peut ajouter un Link Sticker manuellement après ouverture.
 *  • Un Facebook App ID est requis depuis janvier 2023.
 */

import { Capacitor } from '@capacitor/core';

const FACEBOOK_APP_ID: string =
  (import.meta.env.VITE_FACEBOOK_APP_ID as string) || '';

let warnedMissingFacebookAppId = false;
function warnIfMissingFacebookAppId(): void {
  if (FACEBOOK_APP_ID || warnedMissingFacebookAppId) return;
  warnedMissingFacebookAppId = true;
  // Sans Facebook App ID enregistré côté Meta + associé à l'Universal Link
  // de l'app, Instagram ignore le `content_url` et n'affiche pas le lien
  // d'attribution « Ouvrir avec RunConnect ». La story devient alors une
  // simple image (comportement signalé par les utilisateurs).
  console.warn(
    '[instagramStories] VITE_FACEBOOK_APP_ID est vide — Instagram ne pourra pas afficher le lien d\'attribution « Ouvrir avec RunConnect ». Renseigner l\'App ID Meta dans .env.'
  );
}

export type InstagramStoryShareResult =
  | { ok: true; method: 'native_ios' | 'native_android' | 'share_sheet' | 'download' }
  | { ok: false; reason: string };

interface ShareOptions {
  /** PNG data URL (data:image/png;base64,…) */
  imageDataUrl: string;
  /** Universal link to embed as content_url (attribution link). */
  contentUrl: string;
  /** Hex top color for background gradient (if image is transparent). */
  topBgColor?: string;
  /** Hex bottom color for background gradient. */
  bottomBgColor?: string;
}

function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

function isIOS(): boolean {
  return Capacitor.getPlatform() === 'ios';
}

function isAndroid(): boolean {
  return Capacitor.getPlatform() === 'android';
}

/**
 * Share an image to Instagram Stories with a content_url (attribution link).
 *
 * Falls back gracefully:
 *   1. Try native Instagram Stories API (iOS plugin / Android bridge)
 *   2. Fall back to system share sheet with image
 *   3. Fall back to PNG download + user instruction
 */
export async function shareToInstagramStory(opts: ShareOptions): Promise<InstagramStoryShareResult> {
  const { imageDataUrl, contentUrl, topBgColor, bottomBgColor } = opts;

  if (!imageDataUrl) {
    return { ok: false, reason: 'no_image' };
  }

  warnIfMissingFacebookAppId();

  // --- Native iOS: Capacitor plugin ---
  if (Capacitor.isNativePlatform() && isIOS()) {
    try {
      const result = await callIOSPlugin(imageDataUrl, contentUrl, topBgColor, bottomBgColor);
      if (result) return { ok: true, method: 'native_ios' };
    } catch (e) {
      console.warn('[instagramStories] iOS plugin failed, falling back', e);
    }
  }

  // --- Native Android: AndroidBridge ---
  if (Capacitor.isNativePlatform() && isAndroid()) {
    try {
      const result = await callAndroidBridge(imageDataUrl, contentUrl);
      if (result) return { ok: true, method: 'native_android' };
    } catch (e) {
      console.warn('[instagramStories] Android bridge failed, falling back', e);
    }
  }

  // --- Fallback: system share sheet with image file ---
  if (Capacitor.isNativePlatform()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');

      const base64 = dataUrlToBase64(imageDataUrl);
      const fileName = `runconnect-story-${Date.now()}.png`;
      await Filesystem.writeFile({ path: fileName, data: base64, directory: Directory.Cache });
      const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
      await Share.share({ files: [uri], dialogTitle: 'Partager en story Instagram' });
      return { ok: true, method: 'share_sheet' };
    } catch (e) {
      console.warn('[instagramStories] share sheet fallback failed', e);
    }
  }

  // --- Web fallback: Web Share API with file ---
  try {
    const res = await fetch(imageDataUrl);
    const blob = await res.blob();
    const file = new File([blob], `runconnect-story-${Date.now()}.png`, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'RunConnect Story' });
      return { ok: true, method: 'share_sheet' };
    }
  } catch (e) {
    console.warn('[instagramStories] web share failed', e);
  }

  // --- Last resort: download ---
  try {
    const a = document.createElement('a');
    a.href = imageDataUrl;
    a.download = `runconnect-story-${Date.now()}.png`;
    a.click();
    return { ok: true, method: 'download' };
  } catch {
    return { ok: false, reason: 'all_methods_failed' };
  }
}

// ---------------------------------------------------------------------------
// iOS — Capacitor plugin bridge (InstagramStoriesPlugin.swift)
// ---------------------------------------------------------------------------

async function callIOSPlugin(
  imageDataUrl: string,
  contentUrl: string,
  topBgColor?: string,
  bottomBgColor?: string,
): Promise<boolean> {
  const { registerPlugin } = await import('@capacitor/core');

  interface InstagramStoriesPluginDef {
    shareToStory(options: {
      imageBase64: string;
      contentUrl: string;
      facebookAppId: string;
      topBgColor?: string;
      bottomBgColor?: string;
    }): Promise<{ success: boolean }>;

    canShareToInstagram(): Promise<{ available: boolean }>;
  }

  const InstagramStories = registerPlugin<InstagramStoriesPluginDef>('InstagramStories');

  const { available } = await InstagramStories.canShareToInstagram();
  if (!available) {
    console.warn('[instagramStories] Instagram not installed (iOS)');
    return false;
  }

  const base64 = dataUrlToBase64(imageDataUrl);
  const { success } = await InstagramStories.shareToStory({
    imageBase64: base64,
    contentUrl,
    facebookAppId: FACEBOOK_APP_ID,
    topBgColor: topBgColor ?? '#FFFFFF',
    bottomBgColor: bottomBgColor ?? '#FFFFFF',
  });
  return success;
}

// ---------------------------------------------------------------------------
// Android — AndroidBridge JS interface
// ---------------------------------------------------------------------------

interface AndroidBridgeWithInstagram {
  shareToInstagramStory(imageBase64: string, contentUrl: string, facebookAppId: string): void;
  isInstagramInstalled(): boolean;
}

function getAndroidBridge(): AndroidBridgeWithInstagram | null {
  const bridge = (window as any).AndroidBridge as AndroidBridgeWithInstagram | undefined;
  if (bridge && typeof bridge.shareToInstagramStory === 'function') return bridge;
  return null;
}

async function callAndroidBridge(imageDataUrl: string, contentUrl: string): Promise<boolean> {
  const bridge = getAndroidBridge();
  if (!bridge) {
    console.warn('[instagramStories] AndroidBridge.shareToInstagramStory not available');
    return false;
  }

  if (typeof bridge.isInstagramInstalled === 'function' && !bridge.isInstagramInstalled()) {
    console.warn('[instagramStories] Instagram not installed (Android)');
    return false;
  }

  const base64 = dataUrlToBase64(imageDataUrl);
  bridge.shareToInstagramStory(base64, contentUrl, FACEBOOK_APP_ID);
  return true;
}
