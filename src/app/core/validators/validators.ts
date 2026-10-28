import { AbstractControl, AsyncValidatorFn, ValidationErrors, ValidatorFn } from '@angular/forms';
import { Observable, catchError, map, of, switchMap, timer } from 'rxjs';

/** Tiempo de espera (ms) antes de consultar al servidor mientras el usuario escribe. */
export const ASYNC_DEBOUNCE_MS = 400;

/**
 * Crea un validador asíncrono que consulta al servidor si un valor ya existe.
 * Angular cancela la suscripción anterior en cada pulsación, por lo que el
 * `timer` actúa como *debounce* y solo se lanza una petición cuando el usuario
 * deja de escribir. Si la consulta falla no se bloquea el formulario: el
 * servidor volverá a validar al guardar.
 *
 * @param exists Función que devuelve `true` si el valor ya está en uso.
 * @param errorKey Clave del error que se añadirá al control.
 */
export function uniqueValueValidator(
  exists: (value: string) => Observable<boolean>,
  errorKey: string,
): AsyncValidatorFn {
  return (control: AbstractControl): Observable<ValidationErrors | null> => {
    const value = String(control.value ?? '').trim();
    if (!value) {
      return of(null);
    }
    return timer(ASYNC_DEBOUNCE_MS).pipe(
      switchMap(() => exists(value)),
      map((taken) => (taken ? { [errorKey]: true } : null)),
      catchError(() => of(null)),
    );
  };
}

/** Exige al menos una mayúscula, una minúscula, un número y un símbolo. */
export const strongPassword: ValidatorFn = (control) => {
  const value = String(control.value ?? '');
  if (!value) {
    return null;
  }
  const ok = /[A-Z]/.test(value) && /[a-z]/.test(value) && /\d/.test(value) && /[^A-Za-z0-9]/.test(value);
  return ok ? null : { weakPassword: true };
};

/** Validador de grupo: los dos campos indicados deben coincidir. */
export function fieldsMatch(field: string, confirmField: string): ValidatorFn {
  return (group) => {
    const a = group.get(field)?.value;
    const b = group.get(confirmField)?.value;
    return a && b && a !== b ? { mismatch: true } : null;
  };
}
