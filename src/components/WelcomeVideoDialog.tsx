import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

interface WelcomeVideoDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const WelcomeVideoDialog = ({ open, onClose, onComplete }: WelcomeVideoDialogProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // URL de la vidéo - à remplacer par votre vraie vidéo
  const videoUrl = "https://www.w3schools.com/html/mov_bbb.mp4"; // Vidéo d'exemple

  const handleVideoRef = (video: HTMLVideoElement | null) => {
    if (video) {
      video.addEventListener('loadedmetadata', () => {
        setDuration(video.duration);
      });
      
      video.addEventListener('timeupdate', () => {
        setCurrentTime(video.currentTime);
      });
      
      video.addEventListener('ended', () => {
        setIsPlaying(false);
      });
    }
  };

  const togglePlay = () => {
    const video = document.getElementById('welcome-video') as HTMLVideoElement;
    if (video) {
      if (isPlaying) {
        video.pause();
      } else {
        video.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    const video = document.getElementById('welcome-video') as HTMLVideoElement;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const restart = () => {
    const video = document.getElementById('welcome-video') as HTMLVideoElement;
    if (video) {
      video.currentTime = 0;
      setCurrentTime(0);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-center text-xl font-bold">
            🎉 Bienvenue sur RunConnect !
          </DialogTitle>
          <p className="text-center text-muted-foreground mt-2">
            Découvrez toutes les fonctionnalités de votre nouvelle app de running
          </p>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="relative">
                <video
                  id="welcome-video"
                  ref={handleVideoRef}
                  className="w-full h-auto rounded-lg"
                  poster="/placeholder.svg" // Image d'aperçu
                  preload="metadata"
                >
                  <source src={videoUrl} type="video/mp4" />
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
                
                {/* Overlay de contrôles */}
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={togglePlay}
                    className="bg-black/50 hover:bg-black/70 text-white border-0"
                  >
                    {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
                  </Button>
                </div>
              </div>
              
              {/* Barre de contrôles */}
              <div className="p-4 space-y-3">
                {/* Barre de progression */}
                <div className="w-full bg-secondary rounded-full h-2 cursor-pointer">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                
                {/* Contrôles */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={togglePlay}
                    >
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={restart}
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={toggleMute}
                    >
                      {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Description des fonctionnalités */}
          <Card>
            <CardContent className="p-4">
              <h3 className="font-semibold mb-2">Ce que vous allez découvrir :</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>🗺️ Créer et partager vos parcours favoris</li>
                <li>👥 Organiser des séances de course en groupe</li>
                <li>🏆 Suivre vos performances et gravir le classement</li>
                <li>💬 Échanger avec la communauté de runners</li>
                <li>📱 Connecter vos apps Strava et Instagram</li>
                <li>🎯 Rejoindre des clubs et relever des défis</li>
              </ul>
            </CardContent>
          </Card>
          
          {/* Boutons d'action */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Regarder plus tard
            </Button>
            <Button
              onClick={onComplete}
              className="flex-1"
            >
              C'est parti ! 🚀
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};