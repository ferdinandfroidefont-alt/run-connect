import { useNavigate } from "react-router-dom";
import { ReferralParrainagePage } from "@/components/referral/ReferralParrainagePage";

export default function Referral() {
  const navigate = useNavigate();
  return <ReferralParrainagePage onBack={() => navigate(-1)} />;
}
