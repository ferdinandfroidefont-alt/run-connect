import { toPng } from 'html-to-image';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import type { SessionShareTemplateId } from '@/lib/sessionSharePayload';
import { templateDimensions } from '@/lib/sessionSharePayload';

export type SessionShareChannel =
  | 'instagram_story'
  | 'instagram_messages'
  | 'whatsapp'
  | 'messages'
  | 'copy_link'
  | 'more'
  | 'save_image'
  | 'copy_image';

/** Alias produit (stories Instagram / visuels). */
export async function generateStoryImage(
  element: HTMLElement,
  templateId: SessionShareTemplateId
): Promise<string> {
  return generateSessionShareImage(element, templateId);
}

export async function generateSessionShareImage(
  element: HTMLElement,
  templateId: SessionShareTemplateId
): Promise<string> {
  const { w, h } = templateDimensions(templateId);
  const bg = templateId === 'dark_premium' ? '#0f172a' : '#ffffff';
  const dataUrl = await toPng(element, {
    width: w,
    height: h,
    pixelRatio: 1,
    cacheBust: true,
    useCORS: true,
    backgroundColor: bg,
    filter: (node) => {
      if (node instanceof HTMLElement && node.dataset?.shareIgnore === 'true') return false;
      return true;
    },
  });
  return dataUrl;
}

function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(',');
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

async function shareNativeFile(dataUrl: string, title: string): Promise<boolean> {
  const base64 = dataUrlToBase64(dataUrl);
  const fileName = `runconnect-session-${Date.now()}.png`;

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
    console.warn('[sessionShare] native file share failed', e);
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
    console.warn('[sessionShare] web file share failed', e);
  }

  return false;
}

export async function shareSessionImageToSystem(dataUrl: string, title: string): Promise<void> {
  const ok = await shareNativeFile(dataUrl, title);
  if (!ok) {
    await downloadSessionImage(dataUrl);
    toast.info('Image enregistrée — ouvre-la depuis tes fichiers pour la publier en story.');
  }
}

export async function downloadSessionImage(dataUrl: string): Promise<void> {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `runconnect-session-${Date.now()}.png`;
  a.click();
}

export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
    return true;
  } catch {
    return false;
  }
}

export async function shareSessionToChannel(
  channel: SessionShareChannel,
  options: {
    sessionTitle: string;
    publicUrl: string;
    imageDataUrl?: string | null;
  }
): Promise<void> {
  const { sessionTitle, publicUrl, imageDataUrl } = options;
  const text = `${sessionTitle}\n${publicUrl}`;

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
        console.warn('[sessionShare] instagram_story failed, falling back', e);
        await shareSessionImageToSystem(imageDataUrl, sessionTitle);
      }
      return;
    }

    case 'instagram_messages':
      if (imageDataUrl) {
        await shareSessionImageToSystem(imageDataUrl, sessionTitle);
        return;
      }
      toast.error('Image indisponible');
      return;

    case 'whatsapp':
    case 'messages':
    case 'more': {
      try {
        if (Capacitor.isNativePlatform()) {
          await Share.share({
            title: sessionTitle,
            text,
            url: publicUrl,
            dialogTitle: 'Partager la séance',
          });
          return;
        }
        if (navigator.share) {
          await navigator.share({ title: sessionTitle, text, url: publicUrl });
          return;
        }
      } catch (e) {
        console.warn('[sessionShare] share failed', e);
      }
      await navigator.clipboard.writeText(text);
      toast.success('Lien copié dans le presse-papiers');
      return;
    }

    case 'copy_link':
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lien copié');
      return;

    case 'save_image':
      if (imageDataUrl) await downloadSessionImage(imageDataUrl);
      else toast.error('Image indisponible');
      return;

    case 'copy_image':
      if (imageDataUrl && (await copyImageToClipboard(imageDataUrl))) {
        toast.success('Image copiée');
      } else {
        toast.error('Copie image impossible sur cet appareil');
      }
      return;

    default:
      return;
  }
}

/** @deprecated Utiliser shareSessionImageToSystem — alias demandé produit */
export async function shareToInstagramStory(imageDataUrl: string, deepLink: string): Promise<void> {
  void deepLink;
  await shareSessionImageToSystem(imageDataUrl, 'RunConnect — story');
}
