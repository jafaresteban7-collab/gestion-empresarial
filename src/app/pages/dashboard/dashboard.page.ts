import { localDateStamp } from '../../core/utils/date';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonMenuButton } from '@ionic/angular/ion-menu-button';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ORDER_STATUSES, OrderStatus } from '../../core/models/order.model';
import { CATEGORIES, Category } from '../../core/models/product.model';
import { ReportExportService } from '../../core/services/report-export.service';
import { InventoryStore } from '../../core/store/inventory.store';
import { ChartCard, ChartPointEvent, ChartSeries } from '../../shared/components/chart-card/chart-card';
import { LoadState } from '../../shared/components/load-state/load-state';
import { StatWidget } from '../../shared/components/stat-widget/stat-widget';
import { TableColumn, fmt } from '../../shared/models/table-column';
import {
  CategorySummary,
  DashboardFilters,
  computeKpis,
  filterOrders,
  ordersByRegion,
  revenueByDay,
  summaryByCategory,
  topProducts,
} from './dashboard.analytics';

/**
 * Cuadro de mando del Administrador.
 *
 * Consolida pedidos (NoSQL, tiempo real) y productos (SQL) en KPIs y gráficos.
 * Todos los indicadores son señales `computed` que se recalculan al instante
 * cuando cambian los filtros o llega un nuevo pedido en tiempo real.
 */
@Component({
  selector: 'app-dashboard',
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
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonSelect,
    IonSelectOption,
    StatWidget,
    ChartCard,
    LoadState,
  ],
  templateUrl: './dashboard.page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardPage implements OnInit {
  protected readonly store = inject(InventoryStore);
  private readonly exporter = inject(ReportExportService);

  protected readonly categories = CATEGORIES;
  protected readonly statuses = ORDER_STATUSES;

  // Filtros (estado local de la vista)
  protected readonly days = signal(30);
  protected readonly category = signal<Category | 'todas'>('todas');
  protected readonly status = signal<OrderStatus | 'todos'>('todos');

  private readonly filters = computed<DashboardFilters>(() => ({
    days: this.days(),
    category: this.category(),
    status: this.status(),
  }));

  /** Pedidos tras aplicar los filtros. */
  protected readonly filtered = computed(() => filterOrders(this.store.orders(), this.filters()));
  protected readonly kpis = computed(() => computeKpis(this.store.orders(), this.filters()));
  protected readonly daily = computed(() => revenueByDay(this.filtered(), this.days()));
  protected readonly byCategory = computed(() =>
    summaryByCategory(filterOrders(this.store.orders(), { ...this.filters(), category: 'todas' })),
  );
  protected readonly top = computed(() => topProducts(this.filtered()));
  protected readonly regions = computed(() => ordersByRegion(this.filtered()));

  // Series memorizadas: solo cambian (y redibujan el gráfico) cuando cambian sus datos
  protected readonly categoryLabels = [...CATEGORIES];
  protected readonly dailySeries = computed<ChartSeries[]>(() => [{ label: 'Ingresos', data: this.daily().data }]);
  protected readonly categorySeries = computed<ChartSeries[]>(() => [
    { label: 'Ingresos', data: this.byCategory().map((c) => Math.round(c.revenue)) },
  ]);
  protected readonly topSeries = computed<ChartSeries[]>(() => [{ label: 'Ingresos', data: this.top().data }]);
  protected readonly regionSeries = computed<ChartSeries[]>(() => [
    { label: 'Pedidos', data: this.regions().data, color: '#0f766e' },
  ]);

  protected readonly money = (v: number) => fmt.currency.format(v);
  protected readonly lastUpdateText = computed(() => {
    const d = this.store.lastUpdate();
    return d ? d.toLocaleTimeString('es-ES') : '—';
  });

  /** Descripción textual de los filtros activos (para lectores de pantalla y PDF). */
  protected readonly filterSummary = computed(() => {
    const parts = [`Últimos ${this.days()} días`];
    parts.push(this.category() === 'todas' ? 'todas las categorías' : `categoría ${this.category()}`);
    if (this.status() !== 'todos') parts.push(`estado ${this.status()}`);
    return parts.join(', ');
  });

  private readonly summaryColumns: TableColumn<CategorySummary>[] = [
    { key: 'category', label: 'Categoría' },
    { key: 'orders', label: 'Pedidos', align: 'end' },
    { key: 'units', label: 'Unidades', align: 'end' },
    { key: 'revenue', label: 'Ingresos', align: 'end', format: (v) => fmt.currency.format(v as number) },
    { key: 'share', label: '% ingresos', align: 'end', format: (v) => `${(v as number).toFixed(1)} %` },
  ];

  ngOnInit(): void {
    this.store.load();
  }

  protected reload(): void {
    this.store.load(true);
  }

  /** Clic en un sector del gráfico de categorías: filtra (o quita el filtro). */
  protected onCategoryPoint(event: ChartPointEvent): void {
    const selected = event.label as Category;
    this.category.update((current) => (current === selected ? 'todas' : selected));
  }

  /** Widget "Pendientes": conmuta el filtro de estado. */
  protected onPendingToggled(active: boolean): void {
    this.status.set(active ? 'pendiente' : 'todos');
  }

  protected clearFilters(): void {
    this.days.set(30);
    this.category.set('todas');
    this.status.set('todos');
  }

  protected exportPdf(): void {
    const k = this.kpis();
    void this.exporter.downloadPdf({
      title: 'Informe consolidado de ventas por categoría',
      filename: `informe-ventas-${localDateStamp()}`,
      subtitle: `Filtros: ${this.filterSummary()}`,
      summary: [
        { label: 'Ingresos', value: fmt.currency.format(k.revenue) },
        { label: 'Pedidos', value: fmt.number.format(k.orders) },
        { label: 'Ticket medio', value: fmt.currency.format(k.avgTicket) },
        { label: 'Pendientes', value: fmt.number.format(k.pending) },
      ],
      columns: this.summaryColumns,
      rows: this.byCategory(),
    });
  }

  protected exportCsv(): void {
    this.exporter.downloadCsv({
      title: 'Informe consolidado de ventas por categoría',
      filename: `informe-ventas-${localDateStamp()}`,
      columns: this.summaryColumns,
      rows: this.byCategory(),
    });
  }
}
