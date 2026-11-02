import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// Solicita permissão apenas quando o utilizador escolhe usar GPS.
export async function currentLocation() {
  if (Capacitor.isNativePlatform()) {
    const permission = await Geolocation.requestPermissions();
    if (permission.location !== 'granted' && permission.coarseLocation !== 'granted') {
      throw new Error('Localização não autorizada. Ativa-a nas definições da aplicação Android.');
    }
    const pos = await Geolocation.getCurrentPosition({
      enableHighAccuracy: permission.location === 'granted',
      timeout: 20000,
      maximumAge: 0
    });
    return { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy };
  }
  if (!navigator.geolocation) {
    throw new Error('GPS indisponível. No navegador, utiliza HTTPS.');
  }
  return await new Promise((resolve,reject)=>{
    navigator.geolocation.getCurrentPosition(
      pos=>resolve({lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy:pos.coords.accuracy}),
      err=>reject(new Error(err.code===1?'Localização recusada. Altera as permissões do navegador.':'Não foi possível obter GPS. Confirma que a localização está ativa.')),
      {enableHighAccuracy:true,timeout:20000,maximumAge:0}
    );
  });
}
