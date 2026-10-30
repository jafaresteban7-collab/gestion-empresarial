import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { AuthService } from '../../core/auth/auth.service';
import { CATEGORIES, Category, LOW_STOCK_THRESHOLD, Product } from '../../core/models/product.model';
import { NotificationService } from '../../core/services/notification.service';
import { ProductService } from '../../core/services/product.service';
import { ReportExportService } from '../../core/services/report-export.service';
import { InventoryStore } from '../../core/store/inventory.store';
import { toUserMessage } from '../../core/utils/errors';
import { DataTable } from '../../shared/components/data-table/data-table';
import { LoadState } from '../../shared/components/load-state/load-state';
import { RowAction, RowActionEvent, TableColumn, fmt } from '../../shared/models/table-column';
import { HasPermission } from '../../shared/directives/has-permission.directive';

/**
 * Listado del inventario (datos SQL vía API REST).
 * Todos los roles pueden consultar y exportar; solo el Administrador ve
 * las acciones de alta, edición y borrado.
 */
@Component({
  selector: 'app-product-list',
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
    IonToggle,
    DataTable,
    LoadState,
    HasPermission,
  ],
  templateUrl: './product-list.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListPage implements OnInit {
  protected readonly store = inject(InventoryStore);
  protected readonly auth = inject(AuthService);
  private readonly api = inject(ProductService);
  private readonly exporter = inject(ReportExportService);
  private readonly notify = inject(NotificationService);
  private readonly router = inject(Router);

  protected readonly categories = CATEGORIES;
  protected readonly category = signal<Category | 'todas'>('todas');
  protected readonly onlyLowStock = signal(false);
  /** Filas visibles en la tabla (tras búsqueda y orden) para exportar lo que se ve. */
  private visibleRows: Product[] = [];

  protected readonly columns: TableColumn<Product>[] = [
    { key: 'sku', label: 'SKU' },
    { key: 'name', label: 'Producto' },
    { key: 'category', label: 'Categoría' },
    { key: 'stock', label: 'Stock', align: 'end', format: (v) => fmt.number.format(v as number) },
    { key: 'price', label: 'Precio', align: 'end', format: (v) => fmt.currency.format(v as number) },
    { key: 'supplier', label: 'Proveedor' },
  ];

  protected readonly actions = computed<RowAction[]>(() =>
    this.auth.can('productos:editar')
      ? [
          { id: 'edit', label: 'Editar', icon: 'create-outline' },
          { id: 'delete', label: 'Eliminar', icon: 'trash-outline', color: 'danger' },
        ]
      : [],
  );

  protected readonly rows = computed(() =>
    this.store
      .products()
      .filter((p) => this.category() === 'todas' || p.category === this.category())
      .filter((p) => !this.onlyLowStock() || p.stock < LOW_STOCK_THRESHOLD),
  );

  ngOnInit(): void {
    this.store.load();
  }

  protected reload(): void {
    this.store.load(true);
  }

  protected onVisibleRows(rows: Product[]): void {
    this.visibleRows = rows;
  }

  protected async onAction({ action, row }: RowActionEvent<Product>): Promise<void> {
    if (action === 'edit') {
      void this.router.navigate(['/productos', row.id, 'editar']);
      return;
    }
    if (action === 'delete') {
      const ok = await this.notify.confirm('Eliminar producto', `¿Seguro que desea eliminar «${row.name}»?`);
      if (!ok) return;
      this.api.delete(row.id).subscribe({
        next: () => {
          this.store.removeProduct(row.id);
          void this.notify.toast(`Producto «${row.name}» eliminado.`);
        },
        error: (err) => void this.notify.toast(toUserMessage(err), 'danger'),
      });
    }
  }

  private reportTitle(): string {
    const cat = this.category() === 'todas' ? 'todas las categorías' : this.category();
    return `Inventario de productos (${cat}${this.onlyLowStock() ? ', solo stock bajo' : ''})`;
  }

  protected exportCsv(): void {
    this.exporter.downloadCsv({
      title: this.reportTitle(),
      filename: 'inventario-productos',
      columns: this.columns,
      rows: this.visibleRows,
    });
  }

  protected exportPdf(): void {
    const rows = this.visibleRows;
    const value = rows.reduce((s, p) => s + p.stock * p.price, 0);
    void this.exporter.downloadPdf({
      title: this.reportTitle(),
      filename: 'inventario-productos',
      columns: this.columns,
      rows,
      summary: [
        { label: 'Productos', value: fmt.number.format(rows.length) },
        { label: 'Unidades en stock', value: fmt.number.format(rows.reduce((s, p) => s + p.stock, 0)) },
        { label: 'Valor del inventario', value: fmt.currency.format(value) },
      ],
    });
  }
}
