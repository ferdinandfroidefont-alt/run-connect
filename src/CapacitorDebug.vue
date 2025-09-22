<template>
  <div style="padding: 20px">
    <h2>🛠️ Debug Capacitor</h2>

    <button @click="checkPlatform">🔍 Vérifier Plateforme</button>
    <button @click="requestLocation">📍 Demander Localisation</button>
    <button @click="requestCamera">📷 Demander Caméra</button>
    <button @click="openGallery">🖼️ Ouvrir Galerie</button>
    <button @click="openSettings">⚙️ Ouvrir Paramètres App</button>
    <button @click="showNotif">🔔 Afficher Notification</button>

    <p style="margin-top: 20px"><strong>Résultat :</strong> {{ result }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  forceCapacitorAndroidDetection,
  initializeCapacitor,
  Permissions
} from '@/services/capacitor.service'

const result = ref('')

const checkPlatform = async () => {
  const forced = forceCapacitorAndroidDetection()
  const init = await initializeCapacitor()
  result.value = `Plateforme: ${init.platform} | Natif: ${init.isNative} | Fix forcé: ${forced}`
}

const requestLocation = async () => {
  try {
    const res = await Permissions.forceRequestLocationPermissions()
    result.value = JSON.stringify(res)
  } catch (err: any) {
    result.value = '❌ Erreur Localisation: ' + err.message
  }
}

const requestCamera = async () => {
  try {
    const res = await Permissions.forceRequestCameraPermissions()
    result.value = JSON.stringify(res)
  } catch (err: any) {
    result.value = '❌ Erreur Caméra: ' + err.message
  }
}

const openGallery = async () => {
  try {
    const res = await Permissions.forceOpenGallery()
    result.value = JSON.stringify(res)
  } catch (err: any) {
    result.value = '❌ Erreur Galerie: ' + err.message
  }
}

const openSettings = async () => {
  try {
    const res = await Permissions.openAppSettings()
    result.value = JSON.stringify(res)
  } catch (err: any) {
    result.value = '❌ Erreur paramètres: ' + err.message
  }
}

const showNotif = async () => {
  try {
    const res = await Permissions.showLocalNotification('RunConnect 🚀', 'Test notification locale OK !')
    result.value = JSON.stringify(res)
  } catch (err: any) {
    result.value = '❌ Erreur Notification: ' + err.message
  }
}
</script>