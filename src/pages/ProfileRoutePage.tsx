import { useNavigate } from "react-router-dom";
import { ProfileDialog } from "@/components/ProfileDialog";

export default function ProfileRoutePage() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-secondary">
      <ProfileDialog
        open
        onOpenChange={(open) => {
          if (!open) navigate("/");
        }}
      />
    </div>
  );
}
