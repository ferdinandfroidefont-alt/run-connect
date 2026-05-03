import { useNavigate } from "react-router-dom";
import { HomeFeedSheetContent } from "@/components/home/HomeFeedSheetContent";

export default function Feed() {
  const navigate = useNavigate();

  return (
    <div className="feed-flat flex h-full min-h-0 flex-col overflow-hidden">
      <HomeFeedSheetContent
        sheetSnap={2}
        onBrandClick={() => navigate("/", { replace: true })}
        scrollClassName="pb-ios-4"
      />
    </div>
  );
}
