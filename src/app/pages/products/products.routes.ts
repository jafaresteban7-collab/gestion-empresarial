import { Routes } from '@angular/router';
import { roleGuard } from '../../core/auth/auth.guards';

/** Rutas hijas del módulo de productos (cargadas de forma diferida). */
export const PRODUCT_ROUTES: Routes = [
  {
    path: '',
    title: 'Productos · GestiónPro',
    loadComponent: () => import('./product-list.page').then((m) => m.ProductListPage),
  },
  {
    path: 'nuevo',
    canMatch: [roleGuard],
    data: { roles: ['admin'] },
    title: 'Nuevo producto · GestiónPro',
    loadComponent: () => import('./product-form.page').then((m) => m.ProductFormPage),
  },
  {
    path: ':id/editar',
    canMatch: [roleGuard],
    data: { roles: ['admin'] },
    title: 'Editar producto · GestiónPro',
    loadComponent: () => import('./product-form.page').then((m) => m.ProductFormPage),
  },
];
