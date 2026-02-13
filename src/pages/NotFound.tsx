import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { MapPin, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-secondary px-6">
      <div className="flex flex-col items-center text-center space-y-6">
        {/* Icon */}
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
          <MapPin className="h-10 w-10 text-primary" />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="text-ios-title1 text-foreground">Page introuvable</h1>
          <p className="text-ios-body text-muted-foreground max-w-[280px]">
            Cette page n'existe pas ou a été déplacée.
          </p>
        </div>

        {/* Button */}
        <Button
          onClick={() => navigate('/')}
          className="rounded-full px-8 h-12 text-[17px] font-semibold"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
