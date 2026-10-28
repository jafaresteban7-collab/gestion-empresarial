import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  LOCALE_ID,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { PreloadAllModules, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideIonicAngular } from '@ionic/angular/provide';
import { routes } from './app.routes';
import { mockBackendInterceptor } from './core/api/mock-backend.interceptor';
import { authInterceptor } from './core/auth/auth.interceptor';

registerLocaleData(localeEs);

/**
 * Configuración global de la aplicación (inyección de dependencias).
 * Orden de interceptores: primero se añade el JWT y después la petición
 * llega a la API REST (simulada).
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // Ionic sincroniza estados de formularios y animaciones apoyándose en zone.js
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular({ mode: 'md' }),
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules)),
    provideHttpClient(withInterceptors([authInterceptor, mockBackendInterceptor])),
    { provide: LOCALE_ID, useValue: 'es' },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
