import { Directive, TemplateRef, ViewContainerRef, effect, inject, input, untracked } from '@angular/core';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';

/**
 * Directiva estructural que solo pinta su contenido si el usuario tiene el
 * permiso (o todos los permisos) indicados. Reacciona a la sesión mediante
 * Signals: si el usuario cambia o se renueva el token, la vista se actualiza.
 *
 * Ocultar un botón es solo una mejora de UX: la seguridad real la aplican los
 * guards de ruta y el backend, que vuelve a comprobar el permiso.
 *
 * @example
 * <ion-button *hasPermission="'productos:editar'">Nuevo producto</ion-button>
 * <p *hasPermission="'dashboard:ver'; else sinAcceso">…</p>
 */
@Directive({ selector: '[hasPermission]' })
export class HasPermission {
  private readonly auth = inject(AuthService);
  private readonly template = inject(TemplateRef<unknown>);
  private readonly container = inject(ViewContainerRef);

  /** Permiso o lista de permisos necesarios. */
  readonly hasPermission = input.required<Permission | readonly Permission[]>();
  /** Plantilla alternativa cuando no hay permiso. */
  readonly hasPermissionElse = input<TemplateRef<unknown> | null>(null);

  constructor() {
    effect(() => {
      const required = this.hasPermission();
      const allowed = this.auth.canAll(typeof required === 'string' ? [required] : required);
      const template = allowed ? this.template : this.hasPermissionElse();
      untracked(() => {
        this.container.clear();
        if (template) {
          this.container.createEmbeddedView(template);
        }
      });
    });
  }
}
