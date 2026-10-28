import { Category } from './product.model';

/** Estados posibles de un pedido. */
export const ORDER_STATUSES = ['pendiente', 'enviado', 'entregado', 'cancelado'] as const;

/** Estado de un pedido. */
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Regiones comerciales (datos sintéticos). */
export const REGIONS = ['Norte', 'Sur', 'Centro', 'Este', 'Oeste'] as const;

/**
 * Documento de pedido almacenado en la base de datos documental
 * en tiempo real (NoSQL, estilo Firebase Firestore).
 */
export interface OrderDoc {
  id: string;
  productId: number;
  productName: string;
  category: Category;
  quantity: number;
  total: number;
  status: OrderStatus;
  region: string;
  createdAt: string;
}
