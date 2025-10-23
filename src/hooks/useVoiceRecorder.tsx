import { useState, useRef } from 'react';

export interface VoiceRecorderResult {
  audioBlob: Blob;
  duration: number;
}

export const useVoiceRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async (): Promise<boolean> => {
    try {
      console.log('🎤 Vérification permissions microphone...');
      
      // Vérifier d'abord les permissions
      if (navigator.permissions) {
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('🎤 État permission:', permissionStatus.state);
          
          if (permissionStatus.state === 'denied') {
            console.error('❌ Permission microphone refusée définitivement');
            throw new Error('PERMISSION_DENIED');
          }
        } catch (permError) {
          console.log('⚠️ Permissions API non disponible, tentative directe');
        }
      }
      
      console.log('🎤 Demande accès microphone...');
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      console.log('✅ Permission microphone accordée');

      // Créer le MediaRecorder avec le bon format
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      console.log('🎤 Format audio utilisé:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setRecordingDuration(0);

      // Timer pour afficher la durée
      timerRef.current = setInterval(() => {
        setRecordingDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      console.log('🎤 Enregistrement démarré');
      return true;
    } catch (error: any) {
      console.error('❌ Erreur microphone:', error);
      
      // Gérer le cas "refus définitif"
      if (error.message === 'PERMISSION_DENIED' || error.name === 'NotAllowedError') {
        throw new Error('PERMISSION_SETTINGS');
      }
      
      return false;
    }
  };

  const stopRecording = (): Promise<VoiceRecorderResult | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { 
          type: mediaRecorderRef.current?.mimeType || 'audio/webm' 
        });
        const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);

        // Arrêter tous les tracks audio
        if (mediaRecorderRef.current?.stream) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }

        // Nettoyer le timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }

        setIsRecording(false);
        setRecordingDuration(0);
        mediaRecorderRef.current = null;

        console.log('✅ Enregistrement terminé:', duration, 'secondes, taille:', audioBlob.size, 'bytes');
        resolve({ audioBlob, duration });
      };

      mediaRecorderRef.current.stop();
    });
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (mediaRecorderRef.current.stream) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      mediaRecorderRef.current = null;
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordingDuration(0);
      console.log('❌ Enregistrement annulé');
    }
  };

  return {
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording
  };
};
