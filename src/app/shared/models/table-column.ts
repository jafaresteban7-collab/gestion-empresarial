/**
 * Definición de una columna tabular. Se comparte entre el componente
 * `DataTable` y el servicio de exportación (PDF/CSV) para que la tabla en
 * pantalla y los informes muestren exactamente las mismas columnas.
 */
export interface TableColumn<T> {
  /** Propiedad del objeto que se muestra. */
  key: keyof T & string;
  /** Texto de la cabecera. */
  label: string;
  /** Formateador opcional del valor. */
  format?: (value: T[keyof T], row: T) => string;
  /** Alineación (los números se alinean a la derecha). */
  align?: 'start' | 'end';
  /** Permite ordenar por esta columna (por defecto `true`). */
  sortable?: boolean;
}

/** Acción disponible en cada fila de la tabla. */
export interface RowAction {
  id: string;
  label: string;
  icon: string;
  color?: 'primary' | 'danger' | 'medium';
}

/** Evento emitido al pulsar una acción de fila. */
export interface RowActionEvent<T> {
  action: string;
  row: T;
}

/** Obtiene el texto a mostrar/exportar de una celda. */
export function cellText<T>(column: TableColumn<T>, row: T): string {
  const value = row[column.key];
  if (column.format) {
    return column.format(value, row);
  }
  return value === null || value === undefined ? '' : String(value);
}

/** Formateadores reutilizables en español. */
export const fmt = {
  currency: new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }),
  number: new Intl.NumberFormat('es-ES'),
  date: new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeStyle: 'short' }),
};
