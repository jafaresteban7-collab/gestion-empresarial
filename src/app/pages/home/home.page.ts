import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { AuthService } from '../../core/auth/auth.service';
import { InventoryStore } from '../../core/store/inventory.store';
import { LoadState } from '../../shared/components/load-state/load-state';
import { StatWidget } from '../../shared/components/stat-widget/stat-widget';
import { fmt } from '../../shared/models/table-column';
import { HasPermission } from '../../shared/directives/has-permission.directive';

/** Página de inicio común a ambos roles: resumen rápido y accesos directos. */
@Component({
  selector: 'app-home',
  imports: [
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    StatWidget,
    LoadState,
    HasPermission,
  ],
  templateUrl: './home.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly store = inject(InventoryStore);

  protected readonly greeting = computed(() => {
    const h = new Date().getHours();
    return h < 13 ? 'Buenos días' : h < 21 ? 'Buenas tardes' : 'Buenas noches';
  });
  protected readonly todayOrders = computed(() => {
    const today = new Date().toDateString();
    return this.store.orders().filter((o) => new Date(o.createdAt).toDateString() === today).length;
  });
  protected readonly inventoryValue = computed(() => fmt.currency.format(this.store.inventoryValue()));

  ngOnInit(): void {
    this.store.load();
  }

  protected reload(): void {
    this.store.load(true);
  }
}
