import { OrderDoc } from '../../core/models/order.model';
import { computeKpis, filterOrders, revenueByDay, summaryByCategory, topProducts } from './dashboard.analytics';

const now = new Date('2026-10-28T12:00:00');

function order(partial: Partial<OrderDoc>, daysAgo: number): OrderDoc {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  return {
    id: Math.random().toString(36),
    productId: 1,
    productName: 'Portátil',
    category: 'Hardware',
    quantity: 1,
    total: 100,
    status: 'entregado',
    region: 'Norte',
    createdAt: date.toISOString(),
    ...partial,
  };
}

describe('dashboard.analytics', () => {
  const orders: OrderDoc[] = [
    order({ total: 100 }, 0),
    order({ total: 200, category: 'Software', productName: 'Licencia' }, 2),
    order({ total: 50, status: 'cancelado' }, 3),
    order({ total: 300, status: 'pendiente' }, 5),
    order({ total: 80 }, 10), // periodo anterior (7 días)
  ];
  const base = { days: 7, category: 'todas' as const, status: 'todos' as const };

  it('filtra por periodo, categoría y estado', () => {
    expect(filterOrders(orders, base, now)).toHaveLength(4);
    expect(filterOrders(orders, { ...base, category: 'Software' }, now)).toHaveLength(1);
    expect(filterOrders(orders, { ...base, status: 'pendiente' }, now)).toHaveLength(1);
  });

  it('calcula KPIs excluyendo cancelados y la tendencia frente al periodo anterior', () => {
    const k = computeKpis(orders, base, now);
    expect(k.revenue).toBe(600);
    expect(k.orders).toBe(4);
    expect(k.avgTicket).toBe(200);
    expect(k.pending).toBe(1);
    expect(k.revenueTrend).toBeCloseTo(650);
  });

  it('agrupa ingresos por día', () => {
    const series = revenueByDay(orders, 7, now);
    expect(series.data).toHaveLength(7);
    expect(series.data.at(-1)).toBe(100);
    expect(series.data.reduce((a, b) => a + b, 0)).toBe(600);
  });

  it('consolida por categoría con porcentaje de ingresos', () => {
    const rows = summaryByCategory(filterOrders(orders, base, now));
    const hw = rows.find((r) => r.category === 'Hardware')!;
    expect(hw.orders).toBe(3);
    expect(hw.revenue).toBe(400);
    expect(rows.reduce((s, r) => s + r.share, 0)).toBeCloseTo(100);
  });

  it('ordena el top de productos por ingresos', () => {
    const top = topProducts(orders, 2);
    expect(top.labels).toEqual(['Portátil', 'Licencia']);
  });
});
