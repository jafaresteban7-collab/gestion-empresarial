import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, retry } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Product, ProductInput } from '../models/product.model';

/**
 * Servicio de acceso a la API REST de productos (origen de datos relacional, SQL).
 * Todas las operaciones son asíncronas y devuelven Observables de RxJS.
 */
@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/products`;

  /** `GET /products` — reintenta una vez ante fallos transitorios de red. */
  getAll(): Observable<Product[]> {
    return this.http.get<Product[]>(this.url).pipe(retry({ count: 1, delay: 500 }));
  }

  /** `GET /products/:id` */
  getById(id: number): Observable<Product> {
    return this.http.get<Product>(`${this.url}/${id}`);
  }

  /** `POST /products` (solo Administrador). */
  create(input: ProductInput): Observable<Product> {
    return this.http.post<Product>(this.url, input);
  }

  /** `PUT /products/:id` (solo Administrador). */
  update(id: number, input: ProductInput): Observable<Product> {
    return this.http.put<Product>(`${this.url}/${id}`, input);
  }

  /** `DELETE /products/:id` (solo Administrador). */
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`);
  }

  /** Comprueba si un SKU ya está en uso (validación asíncrona). */
  skuExists(sku: string, excludeId?: number): Observable<boolean> {
    const params: Record<string, string> = { sku };
    if (excludeId !== undefined) {
      params['excludeId'] = String(excludeId);
    }
    return this.http
      .get<{ exists: boolean }>(`${this.url}/sku-exists`, { params })
      .pipe(map((r) => r.exists));
  }
}
