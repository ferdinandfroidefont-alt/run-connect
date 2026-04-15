import { Copy, Download, ImageIcon, Instagram, MessageCircle, MoreHorizontal } from 'lucide-react';
import { SessionShareActionButton } from './SessionShareActionButton';
import type { SessionShareChannel } from '@/services/sessionShareService';

type Props = {
  busy?: boolean;
  onChannel: (c: SessionShareChannel) => void;
};

/** Icônes Instagram : marque non dispo dans lucide — on réutilise un glyphe proche. */
function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SessionShareActionsGrid({ busy, onChannel }: Props) {
  return (
    <div className="w-full">
      <p className="mb-3 px-1 text-[13px] font-semibold text-muted-foreground">Partager sur</p>
      <div className="flex flex-wrap justify-between gap-y-2">
        <SessionShareActionButton
          disabled={busy}
          icon={<InstagramGlyph className="h-5 w-5" />}
          label="Story Instagram"
          onClick={() => onChannel('instagram_story')}
        />
        <SessionShareActionButton
          disabled={busy}
          icon={<Instagram className="h-5 w-5" />}
          label="Messages IG"
          onClick={() => onChannel('instagram_messages')}
        />
        <SessionShareActionButton
          disabled={busy}
          icon={
            <span className="text-lg font-bold" style={{ color: '#25D366' }}>
              W
            </span>
          }
          label="WhatsApp"
          onClick={() => onChannel('whatsapp')}
        />
        <SessionShareActionButton
          disabled={busy}
          icon={<MessageCircle className="h-5 w-5" />}
          label="Messages"
          onClick={() => onChannel('messages')}
        />
        <SessionShareActionButton
          disabled={busy}
          icon={<Copy className="h-5 w-5" />}
          label="Copier le lien"
          onClick={() => onChannel('copy_link')}
        />
        <SessionShareActionButton
          disabled={busy}
          icon={<MoreHorizontal className="h-5 w-5" />}
          label="Plus"
          onClick={() => onChannel('more')}
        />
        <SessionShareActionButton
          disabled={busy}
          icon={<Download className="h-5 w-5" />}
          label="Enregistrer"
          onClick={() => onChannel('save_image')}
        />
        <SessionShareActionButton
          disabled={busy}
          icon={<ImageIcon className="h-5 w-5" />}
          label="Copier image"
          onClick={() => onChannel('copy_image')}
        />
      </div>
    </div>
  );
}
