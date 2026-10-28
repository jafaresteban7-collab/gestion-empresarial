import { Product, ProductInput } from '../models/product.model';
import { UserRecord } from '../models/user.model';
import { local, readJson, writeJson } from '../utils/storage';
import { SEED_PRODUCTS, SEED_USERS } from './seed-data';

/** Estructura de la base de datos relacional simulada (una tabla por propiedad). */
interface Tables {
  users: UserRecord[];
  products: Product[];
}

const STORAGE_KEY = 'ge.sql-db.v1';

/**
 * Base de datos relacional simulada que respalda la API REST.
 * Emula tablas con claves primarias autoincrementales y restricciones
 * de unicidad (email de usuario y SKU de producto). Persiste en `localStorage`
 * para que los cambios sobrevivan a recargas del navegador.
 */
export class SqlDatabase {
  private tables: Tables;

  constructor(private readonly storage: Storage | undefined = local()) {
    this.tables = readJson<Tables>(storage, STORAGE_KEY) ?? {
      users: structuredClone(SEED_USERS),
      products: structuredClone(SEED_PRODUCTS),
    };
  }

  /** `SELECT * FROM users WHERE lower(email) = lower(?)` */
  findUserByEmail(email: string): UserRecord | undefined {
    const needle = email.trim().toLowerCase();
    return this.tables.users.find((u) => u.email.toLowerCase() === needle);
  }

  /** `SELECT * FROM users WHERE id = ?` */
  findUserById(id: number): UserRecord | undefined {
    return this.tables.users.find((u) => u.id === id);
  }

  /** `SELECT * FROM users ORDER BY id` */
  listUsers(): UserRecord[] {
    return [...this.tables.users];
  }

  /** `INSERT INTO users …` (falla si el email ya existe). */
  insertUser(user: Omit<UserRecord, 'id' | 'createdAt'>): UserRecord {
    if (this.findUserByEmail(user.email)) {
      throw new ConstraintError('El correo electrónico ya está registrado.');
    }
    const record: UserRecord = { ...user, id: this.nextId(this.tables.users), createdAt: new Date().toISOString() };
    this.tables.users.push(record);
    this.persist();
    return record;
  }

  /** `SELECT * FROM products ORDER BY id` */
  listProducts(): Product[] {
    return [...this.tables.products];
  }

  /** `SELECT * FROM products WHERE id = ?` */
  findProduct(id: number): Product | undefined {
    return this.tables.products.find((p) => p.id === id);
  }

  /** `SELECT 1 FROM products WHERE upper(sku) = upper(?) AND id <> ?` */
  skuExists(sku: string, excludeId?: number): boolean {
    const needle = sku.trim().toUpperCase();
    return this.tables.products.some((p) => p.sku.toUpperCase() === needle && p.id !== excludeId);
  }

  /** `INSERT INTO products …` */
  insertProduct(input: ProductInput): Product {
    if (this.skuExists(input.sku)) {
      throw new ConstraintError('El SKU ya existe.');
    }
    const product: Product = { ...input, id: this.nextId(this.tables.products), updatedAt: new Date().toISOString() };
    this.tables.products.push(product);
    this.persist();
    return product;
  }

  /** `UPDATE products SET … WHERE id = ?` */
  updateProduct(id: number, input: ProductInput): Product | undefined {
    const index = this.tables.products.findIndex((p) => p.id === id);
    if (index === -1) {
      return undefined;
    }
    if (this.skuExists(input.sku, id)) {
      throw new ConstraintError('El SKU ya existe.');
    }
    const updated: Product = { ...input, id, updatedAt: new Date().toISOString() };
    this.tables.products[index] = updated;
    this.persist();
    return updated;
  }

  /** `DELETE FROM products WHERE id = ?` */
  deleteProduct(id: number): boolean {
    const before = this.tables.products.length;
    this.tables.products = this.tables.products.filter((p) => p.id !== id);
    this.persist();
    return this.tables.products.length < before;
  }

  private nextId(rows: { id: number }[]): number {
    return rows.reduce((max, r) => Math.max(max, r.id), 0) + 1;
  }

  private persist(): void {
    writeJson(this.storage, STORAGE_KEY, this.tables);
  }
}

/** Error de restricción de integridad (equivalente a un `UNIQUE` violado). */
export class ConstraintError extends Error {}
