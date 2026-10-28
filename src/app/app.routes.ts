import { Routes } from '@angular/router';
import { authGuard, guestGuard, roleGuard } from './core/auth/auth.guards';

/**
 * Rutas de la aplicación. Todas las vistas se cargan de forma diferida
 * (lazy loading) con `loadComponent` / `loadChildren`, y se protegen con
 * guards `canMatch` según autenticación y rol.
 */
export const routes: Routes = [
  {
    path: 'login',
    canMatch: [guestGuard],
    title: 'Iniciar sesión · GestiónPro',
    loadComponent: () => import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canMatch: [guestGuard],
    title: 'Crear cuenta · GestiónPro',
    loadComponent: () => import('./pages/register/register.page').then((m) => m.RegisterPage),
  },
  {
    path: '',
    canMatch: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        title: 'Inicio · GestiónPro',
        loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
      },
      {
        path: 'dashboard',
        canMatch: [roleGuard],
        data: { roles: ['admin'] },
        title: 'Cuadro de mando · GestiónPro',
        loadComponent: () => import('./pages/dashboard/dashboard.page').then((m) => m.DashboardPage),
      },
      {
        path: 'productos',
        loadChildren: () => import('./pages/products/products.routes').then((m) => m.PRODUCT_ROUTES),
      },
      {
        path: 'actividad',
        title: 'Actividad en tiempo real · GestiónPro',
        loadComponent: () => import('./pages/activity/activity.page').then((m) => m.ActivityPage),
      },
      {
        path: 'usuarios',
        canMatch: [roleGuard],
        data: { roles: ['admin'] },
        title: 'Usuarios · GestiónPro',
        loadComponent: () => import('./pages/users/users.page').then((m) => m.UsersPage),
      },
      {
        path: 'ayuda',
        title: 'Ayuda · GestiónPro',
        loadComponent: () => import('./pages/help/help.page').then((m) => m.HelpPage),
      },
      {
        path: 'acceso-denegado',
        title: 'Acceso denegado · GestiónPro',
        loadComponent: () => import('./pages/status/status.page').then((m) => m.ForbiddenPage),
      },
    ],
  },
  {
    path: '**',
    title: 'Página no encontrada · GestiónPro',
    loadComponent: () => import('./pages/status/status.page').then((m) => m.NotFoundPage),
  },
];
