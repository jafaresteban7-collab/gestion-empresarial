import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, delay, interval } from 'rxjs';
import { environment } from '../../../environments/environment';
import { generateSeedOrders, randomOrder, SEED_PRODUCTS } from '../api/seed-data';
import { OrderDoc, OrderStatus } from '../models/order.model';
import { local, readJson, writeJson } from '../utils/storage';

const STORAGE_KEY = 'ge.nosql-orders.v1';

/**
 * Base de datos documental en tiempo real (NoSQL) simulada con la misma
 * semántica que Firebase Firestore:
 *
 * - `collectionChanges()` equivale a `onSnapshot(collection(...))`: emite el
 *   conjunto completo de documentos y vuelve a emitir con cada cambio.
 * - `add()` / `updateStatus()` equivalen a `addDoc` / `updateDoc`.
 *
 * Para simular otros clientes conectados, mientras haya suscriptores se
 * insertan nuevos pedidos periódicamente. Sustituir esta clase por el SDK
 * de Firebase no requiere cambios en los componentes.
 */
@Injectable({ providedIn: 'root' })
export class RealtimeDbService implements OnDestroy {
  private readonly orders$ = new BehaviorSubject<OrderDoc[]>(this.load());
  private simulator?: Subscription;
  private listeners = 0;
  private counter = 0;

  /**
   * Suscripción en tiempo real a la colección `orders` (ordenada por fecha desc.).
   * La primera emisión llega tras una latencia simulada de red.
   */
  collectionChanges(): Observable<OrderDoc[]> {
    return new Observable<OrderDoc[]>((subscriber) => {
      this.listeners++;
      this.startSimulator();
      const sub = this.orders$.pipe(delay(environment.mockLatencyMs)).subscribe(subscriber);
      return () => {
        sub.unsubscribe();
        this.listeners--;
        if (this.listeners === 0) {
          this.stopSimulator();
        }
      };
    });
  }

  /** Inserta un documento (equivalente a `addDoc`). */
  add(order: OrderDoc): void {
    this.commit([order, ...this.orders$.value]);
  }

  /** Actualiza el estado de un pedido (equivalente a `updateDoc`). */
  updateStatus(id: string, status: OrderStatus): void {
    this.commit(this.orders$.value.map((o) => (o.id === id ? { ...o, status } : o)));
  }

  ngOnDestroy(): void {
    this.stopSimulator();
  }

  private startSimulator(): void {
    if (this.simulator || environment.realtimeIntervalMs <= 0) {
      return;
    }
    this.simulator = interval(environment.realtimeIntervalMs).subscribe(() => {
      const id = `rt-${Date.now()}-${this.counter++}`;
      this.add(randomOrder(Math.random, SEED_PRODUCTS, new Date(), id));
    });
  }

  private stopSimulator(): void {
    this.simulator?.unsubscribe();
    this.simulator = undefined;
  }

  private commit(orders: OrderDoc[]): void {
    // Se limita el tamaño para no crecer indefinidamente en localStorage
    const trimmed = orders.slice(0, 1500);
    writeJson(local(), STORAGE_KEY, trimmed);
    this.orders$.next(trimmed);
  }

  private load(): OrderDoc[] {
    return readJson<OrderDoc[]>(local(), STORAGE_KEY) ?? generateSeedOrders();
  }
}
