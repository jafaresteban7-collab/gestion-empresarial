/**
 * Datos sintéticos de arranque. No contienen datos personales reales:
 * nombres, correos y proveedores son ficticios (dominio reservado `.test`).
 */
import { ORDER_STATUSES, OrderDoc, REGIONS } from '../models/order.model';
import { Category, Product } from '../models/product.model';
import { UserRecord } from '../models/user.model';

/**
 * Usuarios de prueba. Las contraseñas solo se almacenan como hash SHA-256 con sal;
 * las credenciales de acceso se entregan aparte en la documentación de entrega.
 */
export const SEED_USERS: UserRecord[] = [
  {
    id: 1,
    name: 'Ana Admin',
    email: 'admin@empresa.test',
    role: 'admin',
    department: 'Dirección',
    createdAt: '2026-01-10T09:00:00.000Z',
    salt: 'ge-admin-7f3a',
    passwordHash: 'e5fdd30ad801c8aded9b45125fccce0510b499574b8350865e3637f18b0be6c2',
  },
  {
    id: 2,
    name: 'Ulises Usuario',
    email: 'usuario@empresa.test',
    role: 'user',
    department: 'Ventas',
    createdAt: '2026-02-03T10:30:00.000Z',
    salt: 'ge-user-91bc',
    passwordHash: 'defea6085830aeb7d9e2f91015a144de5516e5e7d17c9e0a9434e07331ac187a',
  },
  {
    id: 3,
    name: 'Lucía Analista',
    email: 'analista@empresa.test',
    role: 'user',
    department: 'Compras',
    createdAt: '2026-03-15T08:15:00.000Z',
    salt: 'ge-user-2d4e',
    passwordHash: 'cbfd4d3d82efc76dc37c3ee7f2b23643f97f94675afc92bbf73719ab110dcbc5',
  },
];

const P = (
  id: number,
  sku: string,
  name: string,
  category: Category,
  stock: number,
  price: number,
  supplier: string,
): Product => ({ id, sku, name, category, stock, price, supplier, updatedAt: '2026-10-01T08:00:00.000Z' });

/** Catálogo inicial de productos (tabla `products`). */
export const SEED_PRODUCTS: Product[] = [
  P(1, 'HW-001', 'Portátil 14" i5', 'Hardware', 34, 849, 'Tecnodistrib S.L.'),
  P(2, 'HW-002', 'Monitor 27" QHD', 'Hardware', 52, 289, 'Tecnodistrib S.L.'),
  P(3, 'HW-003', 'Teclado mecánico', 'Hardware', 8, 79, 'Periféricos Iberia'),
  P(4, 'HW-004', 'Ratón inalámbrico', 'Hardware', 120, 25, 'Periféricos Iberia'),
  P(5, 'HW-005', 'Docking USB-C', 'Hardware', 6, 159, 'Tecnodistrib S.L.'),
  P(6, 'HW-006', 'Auriculares con micrófono', 'Hardware', 64, 59, 'Audio Pro Sur'),
  P(7, 'SW-001', 'Licencia ofimática anual', 'Software', 200, 99, 'SoftLic Europa'),
  P(8, 'SW-002', 'Antivirus corporativo', 'Software', 150, 45, 'SoftLic Europa'),
  P(9, 'SW-003', 'Suite de diseño', 'Software', 18, 599, 'Creativa Digital'),
  P(10, 'SW-004', 'ERP módulo inventario', 'Software', 5, 1299, 'Gestiona Cloud'),
  P(11, 'SW-005', 'Backup en la nube (1 TB)', 'Software', 75, 120, 'Gestiona Cloud'),
  P(12, 'SW-006', 'IDE profesional', 'Software', 40, 249, 'Creativa Digital'),
  P(13, 'MB-001', 'Silla ergonómica', 'Mobiliario', 22, 329, 'Oficina Total'),
  P(14, 'MB-002', 'Mesa elevable', 'Mobiliario', 9, 549, 'Oficina Total'),
  P(15, 'MB-003', 'Armario archivador', 'Mobiliario', 14, 189, 'Muebles Centro'),
  P(16, 'MB-004', 'Lámpara LED de escritorio', 'Mobiliario', 48, 39, 'Muebles Centro'),
  P(17, 'MB-005', 'Reposapiés regulable', 'Mobiliario', 3, 35, 'Oficina Total'),
  P(18, 'MB-006', 'Pizarra blanca 120x90', 'Mobiliario', 11, 89, 'Muebles Centro'),
  P(19, 'CO-001', 'Papel A4 (caja 5 paquetes)', 'Consumibles', 310, 22, 'Suministros Norte'),
  P(20, 'CO-002', 'Tóner láser negro', 'Consumibles', 27, 68, 'Suministros Norte'),
  P(21, 'CO-003', 'Bolígrafos (pack 50)', 'Consumibles', 95, 15, 'Suministros Norte'),
  P(22, 'CO-004', 'Cuadernos A5 (pack 10)', 'Consumibles', 7, 18, 'Papelería Este'),
  P(23, 'CO-005', 'Pilas AA (pack 24)', 'Consumibles', 60, 14, 'Papelería Este'),
  P(24, 'CO-006', 'Etiquetas adhesivas', 'Consumibles', 140, 9, 'Papelería Este'),
];

/** Generador pseudoaleatorio determinista (mulberry32) para datos reproducibles. */
export function seededRandom(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Crea un pedido aleatorio a partir del catálogo usando el generador indicado. */
export function randomOrder(rand: () => number, products: Product[], createdAt: Date, id: string): OrderDoc {
  const product = products[Math.floor(rand() * products.length)];
  const quantity = 1 + Math.floor(rand() * 8);
  const r = rand();
  const status = ORDER_STATUSES[r < 0.55 ? 2 : r < 0.8 ? 1 : r < 0.93 ? 0 : 3];
  return {
    id,
    productId: product.id,
    productName: product.name,
    category: product.category,
    quantity,
    total: Math.round(quantity * product.price * 100) / 100,
    status,
    region: REGIONS[Math.floor(rand() * REGIONS.length)],
    createdAt: createdAt.toISOString(),
  };
}

/** Genera el histórico de pedidos de los últimos `days` días (colección `orders`). */
export function generateSeedOrders(now = new Date(), days = 90, perDay = 3): OrderDoc[] {
  const rand = seededRandom(2026);
  const orders: OrderDoc[] = [];
  for (let d = days - 1; d >= 0; d--) {
    const count = Math.max(1, Math.round(perDay + (rand() - 0.5) * 4));
    for (let i = 0; i < count; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - d);
      date.setHours(8 + Math.floor(rand() * 11), Math.floor(rand() * 60), 0, 0);
      if (date > now) {
        date.setTime(now.getTime() - 60_000 * (i + 1));
      }
      orders.push(randomOrder(rand, SEED_PRODUCTS, date, `ord-${d}-${i}`));
    }
  }
  return orders.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
