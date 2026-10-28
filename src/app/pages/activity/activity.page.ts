import { ChangeDetectionStrategy, Component, OnInit, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ORDER_STATUSES, OrderDoc, OrderStatus } from '../../core/models/order.model';
import { ReportExportService } from '../../core/services/report-export.service';
import { InventoryStore } from '../../core/store/inventory.store';
import { DataTable } from '../../shared/components/data-table/data-table';
import { LoadState } from '../../shared/components/load-state/load-state';
import { TableColumn, fmt } from '../../shared/models/table-column';

/**
 * Pedidos en tiempo real (origen NoSQL estilo Firestore).
 * Cada nuevo documento recibido se anuncia mediante una región `aria-live`.
 */
@Component({
  selector: 'app-activity',
  imports: [
    FormsModule,
    RouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonSelect,
    IonSelectOption,
    DataTable,
    LoadState,
  ],
  templateUrl: './activity.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityPage implements OnInit {
  protected readonly store = inject(InventoryStore);
  private readonly exporter = inject(ReportExportService);

  protected readonly statuses = ORDER_STATUSES;
  protected readonly status = signal<OrderStatus | 'todos'>('todos');
  /** Último pedido recibido en tiempo real (para el anuncio accesible). */
  protected readonly announcement = signal('');
  private visibleRows: OrderDoc[] = [];
  private lastSeenId: string | null = null;

  protected readonly columns: TableColumn<OrderDoc>[] = [
    { key: 'createdAt', label: 'Fecha', format: (v) => fmt.date.format(new Date(v as string)) },
    { key: 'productName', label: 'Producto' },
    { key: 'category', label: 'Categoría' },
    { key: 'quantity', label: 'Uds.', align: 'end' },
    { key: 'total', label: 'Importe', align: 'end', format: (v) => fmt.currency.format(v as number) },
    { key: 'region', label: 'Región' },
    { key: 'status', label: 'Estado' },
  ];

  protected readonly rows = computed(() =>
    this.store.orders().filter((o) => this.status() === 'todos' || o.status === this.status()),
  );

  constructor() {
    // Detecta documentos nuevos y los anuncia a los lectores de pantalla
    effect(() => {
      const newest = this.store.orders()[0];
      if (!newest) return;
      untracked(() => {
        if (this.lastSeenId && newest.id !== this.lastSeenId) {
          this.announcement.set(
            `Nuevo pedido: ${newest.quantity} × ${newest.productName}, ${fmt.currency.format(newest.total)}.`,
          );
        }
        this.lastSeenId = newest.id;
      });
    });
  }

  ngOnInit(): void {
    this.store.load();
  }

  protected reload(): void {
    this.store.load(true);
  }

  protected onVisibleRows(rows: OrderDoc[]): void {
    this.visibleRows = rows;
  }

  protected exportCsv(): void {
    this.exporter.downloadCsv({ title: 'Pedidos', filename: 'pedidos', columns: this.columns, rows: this.visibleRows });
  }

  protected exportPdf(): void {
    const rows = this.visibleRows;
    void this.exporter.downloadPdf({
      title: 'Listado de pedidos',
      filename: 'pedidos',
      columns: this.columns,
      rows,
      subtitle: `Estado: ${this.status()}`,
      summary: [
        { label: 'Pedidos', value: fmt.number.format(rows.length) },
        {
          label: 'Importe total',
          value: fmt.currency.format(rows.filter((o) => o.status !== 'cancelado').reduce((s, o) => s + o.total, 0)),
        },
      ],
    });
  }
}
