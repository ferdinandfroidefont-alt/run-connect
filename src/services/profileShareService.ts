import { toPng } from 'html-to-image';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import type { ProfileShareTemplateId } from '@/lib/profileSharePayload';
import { templateDimensions } from '@/lib/profileSharePayload';

export type ProfileShareChannel =
  | 'instagram_story'
  | 'whatsapp'
  | 'messages'
  | 'copy_link'
  | 'more'
  | 'save_image';

function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

async function shareNativeFile(dataUrl: string, title: string): Promise<boolean> {
  const base64 = dataUrlToBase64(dataUrl);
  const fileName = `runconnect-profile-${Date.now()}.png`;

  try {
    if (Capacitor.isNativePlatform()) {
      await Filesystem.writeFile({
        path: fileName,
        data: base64,
        directory: Directory.Cache,
      });
      const { uri } = await Filesystem.getUri({ directory: Directory.Cache, path: fileName });
      await Share.share({
        title,
        files: [uri],
        dialogTitle: title,
      });
      return true;
    }
  } catch (e) {
    console.warn('[profileShare] native file share failed', e);
  }

  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], fileName, { type: 'image/png' });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title });
      return true;
    }
  } catch (e) {
    console.warn('[profileShare] web file share failed', e);
  }

  return false;
}

export async function generateProfileShareImage(
  element: HTMLElement,
  templateId: ProfileShareTemplateId
): Promise<string> {
  const { w, h } = templateDimensions(templateId);
  return toPng(element, {
    width: w,
    height: h,
    pixelRatio: 1,
    cacheBust: true,
    backgroundColor: '#ffffff',
  });
}

export async function shareProfileImageToSystem(dataUrl: string, title: string): Promise<void> {
  const ok = await shareNativeFile(dataUrl, title);
  if (!ok) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `runconnect-profile-${Date.now()}.png`;
    a.click();
    toast.info('Image enregistrée — ajoute-la à ta story depuis Photos.');
  }
}

export async function shareProfileToChannel(
  channel: ProfileShareChannel,
  options: {
    displayName: string;
    publicUrl: string;
    imageDataUrl?: string | null;
  }
): Promise<void> {
  const { displayName, publicUrl, imageDataUrl } = options;
  const text = `${displayName} sur RunConnect\n${publicUrl}`;

  switch (channel) {
    case 'instagram_story': {
      if (!imageDataUrl) { toast.error('Image indisponible'); return; }
      try {
        const { shareToInstagramStory } = await import('@/lib/instagramStories');
        const result = await shareToInstagramStory({
          imageDataUrl,
          contentUrl: publicUrl,
        });
        if (result.ok) {
          if (result.method === 'download') {
            toast.info('Image enregistrée — ouvre Instagram et ajoute-la à ta story.');
          }
        } else {
          toast.error('Partage Instagram échoué');
        }
      } catch (e) {
        console.warn('[profileShare] instagram_story failed, falling back', e);
        await shareProfileImageToSystem(imageDataUrl, displayName);
      }
      return;
    }

    case 'whatsapp':
    case 'messages':
    case 'more': {
      try {
        if (Capacitor.isNativePlatform()) {
          await Share.share({
            title: displayName,
            text,
            url: publicUrl,
            dialogTitle: 'Partager le profil',
          });
          return;
        }
        if (navigator.share) {
          await navigator.share({ title: displayName, text, url: publicUrl });
          return;
        }
      } catch (e) {
        console.warn('[profileShare] share failed', e);
      }
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié');
      return;
    }

    case 'copy_link':
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié');
      return;

    case 'save_image':
      if (imageDataUrl) {
        const a = document.createElement('a');
        a.href = imageDataUrl;
        a.download = `runconnect-profile-${Date.now()}.png`;
        a.click();
      } else toast.error('Image indisponible');
      return;

    default:
      return;
  }
}
