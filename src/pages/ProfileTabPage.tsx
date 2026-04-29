import { ProfileDialog } from "@/components/ProfileDialog";

/** Onglet Profil : même contenu que le dialogue profil, sans overlay modal. */
export default function ProfileTabPage() {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col">
      <ProfileDialog variant="page" open={true} onOpenChange={() => {}} />
    </div>
  );
}
