import { ChangeDetectionStrategy, Component, computed, effect, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { RowAction, RowActionEvent, TableColumn, cellText } from '../../models/table-column';

/** Dirección de ordenación. */
type SortDir = 'asc' | 'desc';

/**
 * Tabla de datos avanzada, genérica y agnóstica de la vista que la contiene.
 *
 * - **Entradas**: columnas, filas, título accesible, tamaño de página y acciones.
 * - **Salidas**: `actionTriggered` (acción sobre una fila), `searchChange`
 *   (término de búsqueda) y `visibleRowsChange` (filas tras filtrar/ordenar,
 *   útil para exportar exactamente lo que el usuario ve).
 * - Búsqueda (two-way binding con `[(ngModel)]`), ordenación por columna y paginación.
 * - Accesible: `<table>` semántica con `<caption>`, `scope` y `aria-sort`;
 *   en móvil cada fila se muestra como tarjeta con etiquetas.
 *
 * @example
 * <app-data-table caption="Productos" [columns]="cols" [rows]="products()"
 *   [actions]="acciones" (actionTriggered)="onAction($event)" />
 */
@Component({
  selector: 'app-data-table',
  imports: [FormsModule, IonSearchbar, IonButton, IonIcon],
  templateUrl: './data-table.html',
  styleUrl: './data-table.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DataTable<T extends { id: number | string }> {
  /** Definición de columnas. */
  readonly columns = input.required<TableColumn<T>[]>();
  /** Filas a mostrar. */
  readonly rows = input.required<T[]>();
  /** Título de la tabla (se lee como `<caption>`). */
  readonly caption = input.required<string>();
  /** Filas por página. */
  readonly pageSize = input(10);
  /** Acciones disponibles por fila. */
  readonly actions = input<RowAction[]>([]);
  /** Texto del buscador. */
  readonly searchPlaceholder = input('Buscar…');
  /** Texto cuando no hay resultados. */
  readonly emptyText = input('No hay registros que coincidan con la búsqueda.');
  /** Columna por la que se ordena inicialmente. */
  readonly initialSort = input<keyof T & string>();
  /** Dirección inicial de ordenación. */
  readonly initialSortDir = input<SortDir>('asc');

  /** Se emite al pulsar una acción de fila. */
  readonly actionTriggered = output<RowActionEvent<T>>();
  /** Se emite cuando cambia el término de búsqueda. */
  readonly searchChange = output<string>();
  /** Se emite con las filas filtradas y ordenadas (todas las páginas). */
  readonly visibleRowsChange = output<T[]>();

  /** Término de búsqueda (enlazado con `[(ngModel)]`). */
  protected search = '';
  private readonly term = signal('');
  protected readonly sortKey = signal<(keyof T & string) | null>(null);
  protected readonly sortDir = signal<SortDir>('asc');
  protected readonly page = signal(0);

  /** Filas que coinciden con la búsqueda, ordenadas. */
  protected readonly filtered = computed(() => {
    const term = normalize(this.term());
    const cols = this.columns();
    let rows = this.rows();
    if (term) {
      rows = rows.filter((row) => cols.some((c) => normalize(cellText(c, row)).includes(term)));
    }
    const key = this.sortKey();
    if (key) {
      const dir = this.sortDir() === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => compare(a[key], b[key]) * dir);
    }
    return rows;
  });

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize())));
  protected readonly pageRows = computed(() => {
    const start = this.page() * this.pageSize();
    return this.filtered().slice(start, start + this.pageSize());
  });
  protected readonly rangeLabel = computed(() => {
    const total = this.filtered().length;
    if (total === 0) return '0 resultados';
    const start = this.page() * this.pageSize() + 1;
    const end = Math.min(total, start + this.pageSize() - 1);
    return `${start}–${end} de ${total}`;
  });

  constructor() {
    effect(() => {
      const initial = this.initialSort();
      if (initial && this.sortKey() === null) {
        this.sortKey.set(initial);
        this.sortDir.set(this.initialSortDir());
      }
    });
    // Mantiene la página dentro de rango si cambian los datos
    effect(() => {
      if (this.page() > this.pageCount() - 1) {
        this.page.set(this.pageCount() - 1);
      }
    });
    effect(() => this.visibleRowsChange.emit(this.filtered()));
  }

  protected onSearch(value: string | null | undefined): void {
    this.search = value ?? '';
    this.term.set(this.search);
    this.page.set(0);
    this.searchChange.emit(this.search);
  }

  protected toggleSort(column: TableColumn<T>): void {
    if (column.sortable === false) return;
    if (this.sortKey() === column.key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(column.key);
      this.sortDir.set('asc');
    }
  }

  protected ariaSort(column: TableColumn<T>): 'ascending' | 'descending' | 'none' {
    if (this.sortKey() !== column.key) return 'none';
    return this.sortDir() === 'asc' ? 'ascending' : 'descending';
  }

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(0, page), this.pageCount() - 1));
  }

  protected cell(column: TableColumn<T>, row: T): string {
    return cellText(column, row);
  }

  /** Texto principal de la fila, usado en las etiquetas accesibles de las acciones. */
  protected rowLabel(row: T): string {
    const first = this.columns().find((c) => c.key === 'name') ?? this.columns()[0];
    return first ? cellText(first, row) : String(row.id);
  }

  protected trigger(action: RowAction, row: T): void {
    this.actionTriggered.emit({ action: action.id, row });
  }
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), 'es', { numeric: true, sensitivity: 'base' });
}
