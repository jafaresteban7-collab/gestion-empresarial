import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonSpinner } from '@ionic/angular/ion-spinner';

/**
 * Indicador reutilizable de estado de carga asíncrona: spinner mientras se
 * cargan datos y mensaje de error con botón "Reintentar". Los cambios se
 * anuncian a lectores de pantalla (`role="status"` / `role="alert"`).
 */
@Component({
  selector: 'app-load-state',
  imports: [IonSpinner, IonButton, IonIcon],
  template: `
    @if (loading()) {
      <div class="state" role="status">
        <ion-spinner name="crescent" aria-hidden="true" />
        <span>{{ loadingText() }}</span>
      </div>
    } @else if (error()) {
      <div class="state error" role="alert">
        <ion-icon name="alert-circle-outline" aria-hidden="true" />
        <span>{{ error() }}</span>
        <ion-button size="small" fill="outline" (click)="retry.emit()">
          <ion-icon slot="start" name="refresh-outline" aria-hidden="true" />
          Reintentar
        </ion-button>
      </div>
    }
  `,
  styles: `
    .state { display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 12px; padding: 32px 16px; color: var(--ion-color-step-700, #4a4f57); }
    .error { color: #a4161a; font-weight: 600; }
    ion-icon { font-size: 24px; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadState {
  /** Muestra el spinner. */
  readonly loading = input(false);
  /** Mensaje de error (si lo hay). */
  readonly error = input<string | null>(null);
  /** Texto mostrado durante la carga. */
  readonly loadingText = input('Cargando datos…');
  /** Se emite al pulsar "Reintentar". */
  readonly retry = output<void>();
}
