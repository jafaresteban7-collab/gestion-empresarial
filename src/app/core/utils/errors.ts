import { HttpErrorResponse } from '@angular/common/http';

/** Convierte cualquier error (HTTP o de otro tipo) en un mensaje comprensible para el usuario. */
export function toUserMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const apiMessage = (error.error as { message?: string } | null)?.message;
    if (apiMessage) {
      return apiMessage;
    }
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. Compruebe su conexión.';
    }
    return `Error del servidor (${error.status}).`;
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Se produjo un error inesperado.';
}
