import { Injectable, computed, inject, signal } from '@angular/core';
import { Subscription, forkJoin, skip, take } from 'rxjs';
import { OrderDoc } from '../models/order.model';
import { LOW_STOCK_THRESHOLD, Product } from '../models/product.model';
import { ProductService } from '../services/product.service';
import { RealtimeDbService } from '../services/realtime-db.service';
import { toUserMessage } from '../utils/errors';

/** Estado de carga del almacén. */
export type LoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Almacén de estado global del inventario (patrón *store* con Signals).
 *
 * Consolida las dos fuentes de datos:
 * - Productos desde la API REST (SQL).
 * - Pedidos desde la base de datos en tiempo real (NoSQL).
 *
 * La carga inicial se orquesta en paralelo con `forkJoin`; después se mantiene
 * una suscripción en tiempo real a los pedidos. El estado solo cambia mediante
 * los métodos del store (flujo unidireccional y predecible).
 */
@Injectable({ providedIn: 'root' })
export class InventoryStore {
  private readonly productApi = inject(ProductService);
  private readonly realtime = inject(RealtimeDbService);
  private live?: Subscription;

  private readonly _products = signal<Product[]>([]);
  private readonly _orders = signal<OrderDoc[]>([]);
  private readonly _status = signal<LoadStatus>('idle');
  private readonly _error = signal<string | null>(null);
  private readonly _lastUpdate = signal<Date | null>(null);

  /** Catálogo de productos. */
  readonly products = this._products.asReadonly();
  /** Pedidos en tiempo real. */
  readonly orders = this._orders.asReadonly();
  /** Estado de la carga. */
  readonly status = this._status.asReadonly();
  /** Mensaje de error de la última carga. */
  readonly error = this._error.asReadonly();
  /** Momento de la última actualización recibida. */
  readonly lastUpdate = this._lastUpdate.asReadonly();
  /** `true` mientras se cargan los datos. */
  readonly loading = computed(() => this._status() === 'loading');
  /** Productos con stock por debajo del umbral. */
  readonly lowStock = computed(() => this._products().filter((p) => p.stock < LOW_STOCK_THRESHOLD));
  /** Valor total del inventario (stock × precio). */
  readonly inventoryValue = computed(() => this._products().reduce((sum, p) => sum + p.stock * p.price, 0));

  /**
   * Carga concurrente de ambas fuentes. Si ya hay datos no vuelve a cargar
   * salvo que se indique `force`.
   */
  load(force = false): void {
    const status = this._status();
    if (status === 'loading' || (status === 'ready' && !force)) {
      return;
    }
    this._status.set('loading');
    this._error.set(null);

    forkJoin({
      products: this.productApi.getAll(),
      orders: this.realtime.collectionChanges().pipe(take(1)),
    }).subscribe({
      next: ({ products, orders }) => {
        this._products.set(products);
        this._orders.set(orders);
        this._lastUpdate.set(new Date());
        this._status.set('ready');
        this.listen();
      },
      error: (err) => {
        this._error.set(toUserMessage(err));
        this._status.set('error');
      },
    });
  }

  /** Inserta o reemplaza un producto tras crearlo/editarlo en la API. */
  upsertProduct(product: Product): void {
    this._products.update((list) => {
      const exists = list.some((p) => p.id === product.id);
      return exists ? list.map((p) => (p.id === product.id ? product : p)) : [...list, product];
    });
  }

  /** Elimina un producto del estado tras borrarlo en la API. */
  removeProduct(id: number): void {
    this._products.update((list) => list.filter((p) => p.id !== id));
  }

  /** Limpia el estado y cancela la escucha en tiempo real (al cerrar sesión). */
  reset(): void {
    this.live?.unsubscribe();
    this.live = undefined;
    this._products.set([]);
    this._orders.set([]);
    this._status.set('idle');
    this._error.set(null);
  }

  private listen(): void {
    if (this.live) {
      return;
    }
    this.live = this.realtime
      .collectionChanges()
      .pipe(skip(1))
      .subscribe((orders) => {
        this._orders.set(orders);
        this._lastUpdate.set(new Date());
      });
  }
}
