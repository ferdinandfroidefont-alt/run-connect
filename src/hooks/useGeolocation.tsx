import { useState, useCallback } from 'react';
import { Geolocation, PermissionStatus } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { Position, GeolocationPermissions } from '@/types/permissions';

export const useGeolocation = () => {
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);

  const checkPermissions = async (): Promise<GeolocationPermissions> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Geolocation.checkPermissions();
        console.log('🔍 Geolocation permissions:', permissions);
        return permissions;
      } catch (error) {
        console.error('❌ Error checking geolocation permissions:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const requestPermissions = async (): Promise<GeolocationPermissions> => {
    if (Capacitor.isNativePlatform()) {
      try {
        const permissions = await Geolocation.requestPermissions();
        console.log('🔍 Requested geolocation permissions:', permissions);
        return permissions;
      } catch (error) {
        console.error('❌ Error requesting geolocation permissions:', error);
        return { location: 'denied', coarseLocation: 'denied' };
      }
    }
    return { location: 'granted', coarseLocation: 'granted' };
  };

  const getCurrentPosition = useCallback(async (): Promise<Position | null> => {
    setLoading(true);
    
    try {
      if (Capacitor.isNativePlatform()) {
        // Solution pour tous les téléphones Android
        console.log('🎯 Début géolocalisation native...');
        
        // 1. Vérifier les permissions existantes
        let permissions = await checkPermissions();
        console.log('🔍 Permissions actuelles:', permissions);
        
        // 2. Si pas de permissions, les demander
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          console.log('📱 Demande de permissions géolocalisation...');
          permissions = await requestPermissions();
          console.log('🔍 Permissions après demande:', permissions);
          
          // Petit délai pour laisser le système traiter
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Re-vérifier les permissions
          permissions = await checkPermissions();
          console.log('🔍 Permissions finales:', permissions);
        }
        
        // 3. Si toujours pas de permission, erreur explicite
        if (permissions.location !== 'granted' && permissions.coarseLocation !== 'granted') {
          throw new Error('Permissions géolocalisation refusées. Veuillez les activer dans les paramètres de votre téléphone : Paramètres > Applications > RunConnect > Autorisations > Position');
        }

        // 4. Essayer la géolocalisation avec plusieurs stratégies
        let coordinates;
        
        // Stratégie 1: Position rapide et imprécise d'abord (fonctionne sur anciens téléphones)
        try {
          console.log('🎯 Tentative géolocalisation rapide...');
          coordinates = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: 15000,
            maximumAge: 300000
          });
          console.log('✅ Position rapide obtenue:', coordinates.coords.latitude, coordinates.coords.longitude);
        } catch (quickError) {
          console.log('⚠️ Position rapide échouée, tentative précise...', quickError);
          
          // Stratégie 2: Position précise avec timeout plus long
          try {
            coordinates = await Geolocation.getCurrentPosition({
              enableHighAccuracy: true,
              timeout: 30000,
              maximumAge: 60000
            });
            console.log('✅ Position précise obtenue:', coordinates.coords.latitude, coordinates.coords.longitude);
          } catch (preciseError) {
            console.log('⚠️ Position précise échouée, dernière tentative...', preciseError);
            
            // Stratégie 3: Dernière tentative avec paramètres très permissifs
            coordinates = await Geolocation.getCurrentPosition({
              enableHighAccuracy: false,
              timeout: 60000,
              maximumAge: 600000
            });
            console.log('✅ Position permissive obtenue:', coordinates.coords.latitude, coordinates.coords.longitude);
          }
        }
        
        const pos = {
          lat: coordinates.coords.latitude,
          lng: coordinates.coords.longitude
        };
        
        setPosition(pos);
        console.log('🎯 Position finale obtenue via Capacitor:', pos, 'Précision:', coordinates.coords.accuracy + 'm');
        return pos;
      } else {
        // Fallback Web API pour navigateurs
        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error('Geolocation not supported'));
            return;
          }

          // Première tentative avec haute précision
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const pos = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
              setPosition(pos);
              console.log('🌐 Position obtenue via Web API:', pos);
              resolve(pos);
            },
            (error) => {
              console.log("🌐 Erreur géolocalisation Web:", error);
              // Fallback avec paramètres permissifs
              navigator.geolocation.getCurrentPosition(
                (position) => {
                  const pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                  };
                  setPosition(pos);
                  resolve(pos);
                },
                (fallbackError) => {
                  console.log("🌐 Erreur géolocalisation fallback:", fallbackError);
                  reject(fallbackError);
                },
                {
                  enableHighAccuracy: false,
                  timeout: 30000,
                  maximumAge: 600000
                }
              );
            },
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            }
          );
        });
      }
    } catch (error) {
      console.error('❌ Erreur géolocalisation finale:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    position,
    loading,
    getCurrentPosition,
    checkPermissions,
    requestPermissions
  };
};