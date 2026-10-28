import { FormControl, FormGroup } from '@angular/forms';
import { firstValueFrom, Observable, of } from 'rxjs';
import { fieldsMatch, strongPassword, uniqueValueValidator } from './validators';

describe('validadores', () => {
  it('strongPassword exige mayúscula, minúscula, número y símbolo', () => {
    expect(strongPassword(new FormControl('debil'))).toEqual({ weakPassword: true });
    expect(strongPassword(new FormControl('Segura2026!'))).toBeNull();
    expect(strongPassword(new FormControl(''))).toBeNull();
  });

  it('fieldsMatch detecta contraseñas distintas', () => {
    const group = new FormGroup(
      { password: new FormControl('Abc12345!'), confirm: new FormControl('otra') },
      { validators: fieldsMatch('password', 'confirm') },
    );
    expect(group.hasError('mismatch')).toBe(true);
    group.controls.confirm.setValue('Abc12345!');
    expect(group.hasError('mismatch')).toBe(false);
  });

  it('uniqueValueValidator marca el error si el servidor indica que existe', async () => {
    const validator = uniqueValueValidator((v) => of(v === 'admin@empresa.test'), 'emailTaken');
    const taken = await firstValueFrom(validator(new FormControl('admin@empresa.test')) as Observable<unknown>);
    const free = await firstValueFrom(validator(new FormControl('libre@empresa.test')) as Observable<unknown>);
    expect(taken).toEqual({ emailTaken: true });
    expect(free).toBeNull();
  });

  it('uniqueValueValidator no bloquea el formulario si la consulta falla', async () => {
    const validator = uniqueValueValidator(
      () => new Observable<boolean>((s) => s.error(new Error('sin red'))),
      'emailTaken',
    );
    expect(await firstValueFrom(validator(new FormControl('x@y.test')) as Observable<unknown>)).toBeNull();
  });
});
