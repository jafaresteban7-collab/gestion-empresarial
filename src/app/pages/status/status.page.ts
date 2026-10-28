import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';

/** Página mostrada cuando el rol del usuario no permite acceder a una ruta. */
@Component({
  selector: 'app-forbidden',
  imports: [IonContent, IonIcon, IonButton, RouterLink],
  template: `
    <ion-content>
      <main class="page-main status-page" tabindex="-1">
        <ion-icon name="lock-closed-outline" aria-hidden="true" class="status-icon" />
        <h1 class="page-title">Acceso denegado</h1>
        <p>Su rol no tiene permisos para acceder a esta sección. Si cree que es un error, contacte con un administrador.</p>
        <ion-button routerLink="/inicio" routerDirection="root">Volver al inicio</ion-button>
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForbiddenPage {}

/** Página 404. */
@Component({
  selector: 'app-not-found',
  imports: [IonContent, IonIcon, IonButton, RouterLink],
  template: `
    <ion-content>
      <main class="page-main status-page" tabindex="-1">
        <ion-icon name="alert-circle-outline" aria-hidden="true" class="status-icon" />
        <h1 class="page-title">Página no encontrada</h1>
        <p>La dirección indicada no existe.</p>
        <ion-button routerLink="/inicio" routerDirection="root">Volver al inicio</ion-button>
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundPage {}
