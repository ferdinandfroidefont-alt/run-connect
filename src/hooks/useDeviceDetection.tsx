import { useState, useEffect } from 'react';
import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';

interface DeviceInfo {
  manufacturer: string;
  model: string;
  platform: string;
  osVersion: string;
  isNative: boolean;
  isRedmiNote9: boolean;
  isMIUI: boolean;
  isAndroid10Plus: boolean;
}

export const useDeviceDetection = () => {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    manufacturer: '',
    model: '',
    platform: '',
    osVersion: '',
    isNative: false,
    isRedmiNote9: false,
    isMIUI: false,
    isAndroid10Plus: false,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    detectDevice();
  }, []);

  const detectDevice = async () => {
    try {
      const isNative = Capacitor.isNativePlatform();
      let deviceDetails = {
        manufacturer: '',
        model: '',
        platform: '',
        osVersion: '',
      };

      if (isNative) {
        try {
          const info = await Device.getInfo();
          deviceDetails = {
            manufacturer: info.manufacturer || '',
            model: info.model || '',
            platform: info.platform || '',
            osVersion: info.osVersion || '',
          };
        } catch (error) {
          console.log('Erreur récupération info device:', error);
        }
      }

      // Détection via User Agent (fallback)
      const userAgent = navigator.userAgent.toLowerCase();
      const detectedInfo = detectFromUserAgent(userAgent);

      const finalInfo: DeviceInfo = {
        manufacturer: deviceDetails.manufacturer || detectedInfo.manufacturer,
        model: deviceDetails.model || detectedInfo.model,
        platform: deviceDetails.platform || detectedInfo.platform,
        osVersion: deviceDetails.osVersion || detectedInfo.osVersion,
        isNative,
        isRedmiNote9: detectRedmiNote9(userAgent, deviceDetails),
        isMIUI: detectMIUI(userAgent, deviceDetails),
        isAndroid10Plus: detectAndroid10Plus(deviceDetails.osVersion, userAgent),
      };

      console.log('🔍 Device détecté:', finalInfo);
      setDeviceInfo(finalInfo);
    } catch (error) {
      console.error('Erreur détection device:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectFromUserAgent = (userAgent: string) => {
    let manufacturer = '';
    let model = '';
    let platform = '';
    let osVersion = '';

    // Détection fabricant
    if (userAgent.includes('xiaomi') || userAgent.includes('redmi')) {
      manufacturer = 'Xiaomi';
    } else if (userAgent.includes('samsung')) {
      manufacturer = 'Samsung';
    } else if (userAgent.includes('huawei')) {
      manufacturer = 'Huawei';
    } else if (userAgent.includes('oppo')) {
      manufacturer = 'Oppo';
    } else if (userAgent.includes('vivo')) {
      manufacturer = 'Vivo';
    } else if (userAgent.includes('oneplus')) {
      manufacturer = 'OnePlus';
    }

    // Détection modèle Redmi Note 9
    if (userAgent.includes('redmi note 9') || userAgent.includes('m2010j19sg')) {
      model = 'Redmi Note 9';
    }

    // Détection plateforme
    if (userAgent.includes('android')) {
      platform = 'android';
      
      // Extraction version Android
      const androidMatch = userAgent.match(/android (\d+(\.\d+)?)/);
      if (androidMatch) {
        osVersion = androidMatch[1];
      }
    }

    return { manufacturer, model, platform, osVersion };
  };

  const detectRedmiNote9 = (userAgent: string, deviceDetails: any): boolean => {
    // Détection via User Agent
    const isRedmiUA = userAgent.includes('redmi note 9') || userAgent.includes('m2010j19sg');
    
    // Détection via Device API
    const isRedmiDevice = (
      deviceDetails.manufacturer?.toLowerCase().includes('xiaomi') &&
      deviceDetails.model?.toLowerCase().includes('note 9')
    );

    return isRedmiUA || isRedmiDevice;
  };

  const detectMIUI = (userAgent: string, deviceDetails: any): boolean => {
    // Détection MIUI via User Agent
    const isMIUIUA = userAgent.includes('miui') || userAgent.includes('xiaomi');
    
    // Détection via fabricant
    const isXiaomiDevice = (
      deviceDetails.manufacturer?.toLowerCase().includes('xiaomi') ||
      deviceDetails.manufacturer?.toLowerCase().includes('redmi')
    );

    return isMIUIUA || isXiaomiDevice;
  };

  const detectAndroid10Plus = (osVersion: string, userAgent: string): boolean => {
    // Via Device API
    if (osVersion) {
      const majorVersion = parseInt(osVersion.split('.')[0]);
      return majorVersion >= 10;
    }

    // Via User Agent
    const androidMatch = userAgent.match(/android (\d+)/);
    if (androidMatch) {
      const majorVersion = parseInt(androidMatch[1]);
      return majorVersion >= 10;
    }

    return false;
  };

  return {
    deviceInfo,
    isLoading,
    detectDevice,
  };
};