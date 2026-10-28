/** Categorías de producto del inventario. */
export const CATEGORIES = ['Hardware', 'Software', 'Mobiliario', 'Consumibles'] as const;

/** Categoría de producto. */
export type Category = (typeof CATEGORIES)[number];

/** Umbral por debajo del cual un producto se considera con stock bajo. */
export const LOW_STOCK_THRESHOLD = 10;

/**
 * Producto del inventario. Se obtiene de la API REST
 * respaldada por la base de datos relacional (SQL).
 */
export interface Product {
  id: number;
  sku: string;
  name: string;
  category: Category;
  stock: number;
  price: number;
  supplier: string;
  updatedAt: string;
}

/** Datos necesarios para crear o actualizar un producto. */
export type ProductInput = Omit<Product, 'id' | 'updatedAt'>;
