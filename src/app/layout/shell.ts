import { ChangeDetectionStrategy, Component, OnDestroy, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { IonAvatar } from '@ionic/angular/ion-avatar';
import { IonContent } from '@ionic/angular/ion-content';
import { IonFooter } from '@ionic/angular/ion-footer';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonListHeader } from '@ionic/angular/ion-list-header';
import { IonMenu } from '@ionic/angular/ion-menu';
import { IonMenuToggle } from '@ionic/angular/ion-menu-toggle';
import { IonNote } from '@ionic/angular/ion-note';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { IonSplitPane } from '@ionic/angular/ion-split-pane';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { AuthService } from '../core/auth/auth.service';
import { Permission } from '../core/auth/permissions';
import { ROLE_LABELS } from '../core/models/user.model';
import { InventoryStore } from '../core/store/inventory.store';

/** Entrada del menú lateral. */
interface MenuEntry {
  label: string;
  url: string;
  icon: string;
  /** Permiso necesario para ver la opción (`null` = cualquier usuario autenticado). */
  permission: Permission | null;
}

const MENU: MenuEntry[] = [
  { label: 'Inicio', url: '/inicio', icon: 'home-outline', permission: null },
  { label: 'Cuadro de mando', url: '/dashboard', icon: 'bar-chart-outline', permission: 'dashboard:ver' },
  { label: 'Productos', url: '/productos', icon: 'cube-outline', permission: 'productos:ver' },
  { label: 'Actividad en tiempo real', url: '/actividad', icon: 'pulse-outline', permission: 'pedidos:ver' },
  { label: 'Usuarios', url: '/usuarios', icon: 'people-outline', permission: 'usuarios:gestionar' },
  { label: 'Ayuda', url: '/ayuda', icon: 'help-circle-outline', permission: null },
];

/**
 * Plantilla principal autenticada: menú lateral (split pane) que se convierte
 * en menú deslizante en móvil, con opciones filtradas según los permisos.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterLink,
    RouterLinkActive,
    IonSplitPane,
    IonMenu,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonMenuToggle,
    IonItem,
    IonIcon,
    IonLabel,
    IonNote,
    IonFooter,
    IonAvatar,
    IonRouterOutlet,
  ],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Shell implements OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly store = inject(InventoryStore);
  /** Opciones de menú visibles con los permisos actuales (signal computada). */
  protected readonly menu = computed(() => MENU.filter((m) => m.permission === null || this.auth.can(m.permission)));
  protected readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role] : '';
  });
  protected readonly initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase(),
  );

  /** Lleva el foco al contenido principal de la página visible (enlace "saltar al contenido"). */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    // Ionic mantiene en el DOM las páginas anteriores ocultas: se elige la visible
    const page = Array.from(document.querySelectorAll<HTMLElement>('main.page-main')).find(
      (el) => el.offsetParent !== null,
    );
    page?.focus();
  }

  protected logout(): void {
    this.auth.logout();
  }

  /** Al salir del área privada (logout) se limpia el estado y la escucha en tiempo real. */
  ngOnDestroy(): void {
    this.store.reset();
  }
}
