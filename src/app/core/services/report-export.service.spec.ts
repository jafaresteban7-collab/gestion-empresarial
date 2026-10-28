import { TableColumn } from '../../shared/models/table-column';
import { toCsv } from './report-export.service';

interface Row {
  id: number;
  name: string;
  price: number;
}

describe('toCsv', () => {
  const columns: TableColumn<Row>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'price', label: 'Precio', format: (v) => `${v} €` },
  ];

  it('genera cabecera y filas separadas por punto y coma con CRLF', () => {
    const csv = toCsv(columns, [
      { id: 1, name: 'Ratón', price: 25 },
      { id: 2, name: 'Teclado', price: 79 },
    ]);
    expect(csv).toBe('Nombre;Precio\r\nRatón;25 €\r\nTeclado;79 €');
  });

  it('escapa separadores, comillas y saltos de línea', () => {
    const csv = toCsv(columns, [{ id: 1, name: 'Mesa "XL"; 120\ncm', price: 5 }]);
    expect(csv.split('\r\n')[1]).toBe('"Mesa ""XL""; 120\ncm";5 €');
  });

  it('solo incluye la cabecera si no hay filas', () => {
    expect(toCsv(columns, [])).toBe('Nombre;Precio');
  });
});
