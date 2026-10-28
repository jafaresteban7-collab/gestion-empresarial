import { JwtPayload, decodeJwt, isJwtExpired, signJwt, verifyJwt } from './jwt';

describe('jwt', () => {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = { sub: 1, email: 'a@b.test', role: 'admin', iat: now, exp: now + 60 };

  it('firma, decodifica y verifica un token válido', async () => {
    const token = await signJwt(payload, 'clave');
    expect(token.split('.')).toHaveLength(3);
    expect(decodeJwt(token)?.role).toBe('admin');
    expect(await verifyJwt(token, 'clave')).toEqual(payload);
  });

  it('rechaza un token con firma alterada', async () => {
    const token = await signJwt(payload, 'clave');
    expect(await verifyJwt(token, 'otra-clave')).toBeNull();
  });

  it('rechaza un token manipulado (escalada de rol)', async () => {
    const token = await signJwt({ ...payload, role: 'user' }, 'clave');
    const [header, , signature] = token.split('.');
    const forgedBody = btoa(JSON.stringify({ ...payload, role: 'admin' })).replace(/=+$/, '');
    expect(await verifyJwt(`${header}.${forgedBody}.${signature}`, 'clave')).toBeNull();
  });

  it('detecta tokens caducados', async () => {
    const token = await signJwt({ ...payload, exp: now - 1 }, 'clave');
    expect(isJwtExpired(token)).toBe(true);
    expect(await verifyJwt(token, 'clave')).toBeNull();
  });

  it('devuelve null con tokens mal formados', () => {
    expect(decodeJwt('no-es-un-token')).toBeNull();
    expect(decodeJwt('a.b.c')).toBeNull();
  });
});
