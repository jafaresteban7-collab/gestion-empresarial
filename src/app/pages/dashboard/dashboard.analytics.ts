/**
 * Funciones puras de consolidación de datos para el cuadro de mando.
 * Al no depender de Angular se pueden probar de forma aislada.
 */
import { OrderDoc, OrderStatus, REGIONS } from '../../core/models/order.model';
import { CATEGORIES, Category } from '../../core/models/product.model';

/** Filtros aplicables al cuadro de mando. */
export interface DashboardFilters {
  /** Días hacia atrás desde hoy. */
  days: number;
  category: Category | 'todas';
  status: OrderStatus | 'todos';
}

/** Indicadores principales. */
export interface Kpis {
  revenue: number;
  orders: number;
  avgTicket: number;
  pending: number;
  revenueTrend: number | null;
  ordersTrend: number | null;
}

/** Fila del informe consolidado por categoría. */
export interface CategorySummary {
  id: string;
  category: Category;
  orders: number;
  units: number;
  revenue: number;
  share: number;
}

const DAY = 86_400_000;

function startOfDay(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Devuelve los pedidos dentro de la ventana `[from, to)` aplicando categoría y estado. */
function inWindow(orders: OrderDoc[], from: number, to: number, f: DashboardFilters): OrderDoc[] {
  return orders.filter((o) => {
    const t = new Date(o.createdAt).getTime();
    return (
      t >= from &&
      t < to &&
      (f.category === 'todas' || o.category === f.category) &&
      (f.status === 'todos' || o.status === f.status)
    );
  });
}

/** Pedidos del periodo seleccionado. */
export function filterOrders(orders: OrderDoc[], f: DashboardFilters, now = new Date()): OrderDoc[] {
  const end = startOfDay(now) + DAY;
  return inWindow(orders, end - f.days * DAY, end, f);
}

/** Ingresos: suma de pedidos no cancelados. */
export function revenueOf(orders: OrderDoc[]): number {
  return orders.filter((o) => o.status !== 'cancelado').reduce((s, o) => s + o.total, 0);
}

function pctChange(current: number, previous: number): number | null {
  return previous === 0 ? null : ((current - previous) / previous) * 100;
}

/** Calcula los KPIs del periodo y su variación respecto al periodo anterior equivalente. */
export function computeKpis(orders: OrderDoc[], f: DashboardFilters, now = new Date()): Kpis {
  const end = startOfDay(now) + DAY;
  const current = inWindow(orders, end - f.days * DAY, end, f);
  const previous = inWindow(orders, end - 2 * f.days * DAY, end - f.days * DAY, f);
  const revenue = revenueOf(current);
  const valid = current.filter((o) => o.status !== 'cancelado').length;
  return {
    revenue,
    orders: current.length,
    avgTicket: valid ? revenue / valid : 0,
    pending: current.filter((o) => o.status === 'pendiente').length,
    revenueTrend: pctChange(revenue, revenueOf(previous)),
    ordersTrend: pctChange(current.length, previous.length),
  };
}

/** Serie de ingresos por día del periodo. */
export function revenueByDay(orders: OrderDoc[], days: number, now = new Date()): { labels: string[]; data: number[] } {
  const end = startOfDay(now) + DAY;
  const start = end - days * DAY;
  const buckets = new Array<number>(days).fill(0);
  for (const o of orders) {
    const t = new Date(o.createdAt).getTime();
    if (t >= start && t < end && o.status !== 'cancelado') {
      buckets[Math.floor((t - start) / DAY)] += o.total;
    }
  }
  const fmt = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
  const labels = buckets.map((_, i) => fmt.format(new Date(start + i * DAY)));
  return { labels, data: buckets.map((v) => Math.round(v)) };
}

/** Consolidado de pedidos e ingresos por categoría. */
export function summaryByCategory(orders: OrderDoc[]): CategorySummary[] {
  const total = revenueOf(orders);
  return CATEGORIES.map((category) => {
    const subset = orders.filter((o) => o.category === category);
    const revenue = revenueOf(subset);
    return {
      id: category,
      category,
      orders: subset.length,
      units: subset.reduce((s, o) => s + o.quantity, 0),
      revenue,
      share: total ? (revenue / total) * 100 : 0,
    };
  });
}

/** Los `n` productos con más ingresos. */
export function topProducts(orders: OrderDoc[], n = 5): { labels: string[]; data: number[] } {
  const map = new Map<string, number>();
  for (const o of orders) {
    if (o.status !== 'cancelado') {
      map.set(o.productName, (map.get(o.productName) ?? 0) + o.total);
    }
  }
  const top = [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
  return { labels: top.map(([k]) => k), data: top.map(([, v]) => Math.round(v)) };
}

/** Número de pedidos por región. */
export function ordersByRegion(orders: OrderDoc[]): { labels: string[]; data: number[] } {
  return {
    labels: [...REGIONS],
    data: REGIONS.map((r) => orders.filter((o) => o.region === r).length),
  };
}
