import { useNavigate } from "react-router-dom";
import { SettingsPremium } from "@/components/settings/SettingsPremium";

const Subscription = () => {
  const navigate = useNavigate();
  return <SettingsPremium onBack={() => navigate(-1)} />;
};

export default Subscription;
