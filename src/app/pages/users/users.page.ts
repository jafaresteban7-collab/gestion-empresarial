import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { AuthService } from '../../core/auth/auth.service';
import { ROLE_LABELS, Role, User } from '../../core/models/user.model';
import { toUserMessage } from '../../core/utils/errors';
import { DataTable } from '../../shared/components/data-table/data-table';
import { LoadState } from '../../shared/components/load-state/load-state';
import { TableColumn, fmt } from '../../shared/models/table-column';

/** Listado de usuarios registrados (solo Administrador). */
@Component({
  selector: 'app-users',
  imports: [IonHeader, IonToolbar, IonButtons, IonMenuButton, IonTitle, IonContent, DataTable, LoadState],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start"><ion-menu-button aria-label="Abrir menú" /></ion-buttons>
        <ion-title>Usuarios</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-main" tabindex="-1">
        <div class="page-head">
          <div>
            <h1 class="page-title">Usuarios registrados</h1>
            <p class="page-subtitle">Datos sintéticos de prueba · tabla <code>users</code> (SQL)</p>
          </div>
        </div>
        <app-load-state
          [loading]="users.isLoading()"
          [error]="users.error() ? errorText() : null"
          (retry)="users.reload()"
        />
        @if (users.hasValue()) {
          <div class="panel">
            <app-data-table caption="Usuarios registrados" [columns]="columns" [rows]="users.value()" />
          </div>
        }
      </main>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersPage {
  private readonly auth = inject(AuthService);

  /** Recurso asíncrono: gestiona carga, error y recarga de forma declarativa. */
  protected readonly users = rxResource({ stream: () => this.auth.listUsers() });

  protected readonly columns: TableColumn<User>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'email', label: 'Correo' },
    { key: 'department', label: 'Departamento' },
    { key: 'role', label: 'Rol', format: (v) => ROLE_LABELS[v as Role] },
    { key: 'createdAt', label: 'Alta', format: (v) => fmt.date.format(new Date(v as string)) },
  ];

  protected errorText(): string {
    return toUserMessage(this.users.error());
  }
}
