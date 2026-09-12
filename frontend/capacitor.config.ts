import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.willay.app',
  appName: 'Willay',
  webDir: 'dist',
  // Fase 2: el build (dist/) va empaquetado dentro del APK — ya no depende
  // de cargar willay.app en vivo. services/api.ts detecta que corre nativo
  // (Capacitor.isNativePlatform()) y apunta directo a https://api.willay.app
  // en vez de usar rutas relativas (que en web resuelve el proxy de Vite /
  // el rewrite de vercel.json, pero que en el WebView empaquetado no
  // existen). Requisito para los plugins nativos que vienen (push, NFC).
  server: {
    // Truco estándar de Capacitor: el WebView sirve los archivos
    // empaquetados localmente, pero se identifica ante el navegador como
    // si fuera willay.app (en vez del "https://localhost" por defecto).
    // Esto evita depender de que el backend permita un origen nuevo por
    // CORS — ya debería permitir su propio dominio real.
    hostname: 'willay.app',
    androidScheme: 'https',
  },
};

export default config;
