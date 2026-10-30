import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { Permission } from '../../core/auth/permissions';
import { HasPermission } from './has-permission.directive';

@Component({
  imports: [HasPermission],
  template: `
    <button *hasPermission="'productos:editar'; else sinPermiso">Editar</button>
    <ng-template #sinPermiso><span>Solo lectura</span></ng-template>
  `,
})
class Host {}

describe('HasPermission', () => {
  const granted = signal<Permission[]>([]);
  const authStub = { canAll: (perms: readonly Permission[]) => perms.every((p) => granted().includes(p)) };

  const render = () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    granted.set([]);
    TestBed.configureTestingModule({ providers: [{ provide: AuthService, useValue: authStub }] });
  });

  it('muestra la plantilla alternativa sin el permiso', () => {
    const el: HTMLElement = render().nativeElement;
    expect(el.querySelector('button')).toBeNull();
    expect(el.textContent).toContain('Solo lectura');
  });

  it('reacciona cuando cambian los permisos de la sesión', () => {
    const fixture = render();
    granted.set(['productos:editar']);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button')?.textContent).toBe('Editar');
    expect(el.textContent).not.toContain('Solo lectura');
  });
});
