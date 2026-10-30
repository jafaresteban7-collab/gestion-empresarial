import { ROLE_PERMISSIONS, permissionsFor } from './permissions';

describe('matriz RBAC', () => {
  it('el Administrador hereda todos los permisos del Usuario estándar', () => {
    expect(ROLE_PERMISSIONS.admin).toEqual(expect.arrayContaining([...ROLE_PERMISSIONS.user]));
  });

  it('el Usuario estándar no tiene permisos de gestión', () => {
    expect(permissionsFor('user')).not.toContain('productos:editar');
    expect(permissionsFor('user')).not.toContain('dashboard:ver');
    expect(permissionsFor('user')).not.toContain('usuarios:gestionar');
  });
});
