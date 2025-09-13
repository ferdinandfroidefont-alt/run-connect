import { PermissionState } from '@capacitor/core';
import { CameraPermissionState, PermissionStatus as CameraPermissionStatus } from '@capacitor/camera';

export interface CameraPermissions {
  camera: CameraPermissionState;
  photos: CameraPermissionState;
}

export interface GeolocationPermissions {
  location: PermissionState;
  coarseLocation: PermissionState;
}

export interface ContactsPermissions {
  contacts: PermissionState;
}

export interface Position {
  lat: number;
  lng: number;
}