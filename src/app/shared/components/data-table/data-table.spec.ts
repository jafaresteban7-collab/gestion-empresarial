import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideIonicAngular } from '@ionic/angular/provide';
import { RowActionEvent, TableColumn } from '../../models/table-column';
import { DataTable } from './data-table';

interface Row {
  id: number;
  name: string;
  stock: number;
}

describe('DataTable', () => {
  let fixture: ComponentFixture<DataTable<Row>>;
  const columns: TableColumn<Row>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'stock', label: 'Stock', align: 'end' },
  ];
  const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, name: `Producto ${i + 1}`, stock: 12 - i }));
  rows[0].name = 'Cámara';

  const bodyRows = () => fixture.nativeElement.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [DataTable], providers: [provideIonicAngular()] }).compileComponents();
    fixture = TestBed.createComponent(DataTable<Row>);
    fixture.componentRef.setInput('columns', columns);
    fixture.componentRef.setInput('rows', rows);
    fixture.componentRef.setInput('caption', 'Prueba');
    fixture.componentRef.setInput('pageSize', 5);
    fixture.componentRef.setInput('actions', [{ id: 'edit', label: 'Editar', icon: 'create-outline' }]);
    fixture.detectChanges();
  });

  it('pagina los resultados', () => {
    expect(bodyRows()).toHaveLength(5);
    expect(fixture.nativeElement.textContent).toContain('Página 1 de 3');
  });

  it('busca ignorando tildes y mayúsculas', () => {
    (fixture.componentInstance as unknown as { onSearch(v: string): void }).onSearch('CAMARA');
    fixture.detectChanges();
    expect(bodyRows()).toHaveLength(1);
    expect(bodyRows()[0].textContent).toContain('Cámara');
  });

  it('ordena al pulsar la cabecera y actualiza aria-sort', () => {
    const header = fixture.nativeElement.querySelectorAll('th')[1] as HTMLElement;
    (header.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(header.getAttribute('aria-sort')).toBe('ascending');
    expect(bodyRows()[0].textContent).toContain('Producto 12');
  });

  it('emite actionTriggered con la fila al pulsar una acción', () => {
    let received: RowActionEvent<Row> | undefined;
    fixture.componentInstance.actionTriggered.subscribe((e) => (received = e));
    (fixture.nativeElement.querySelector('tbody ion-button') as HTMLElement).click();
    expect(received?.action).toBe('edit');
    expect(received?.row.id).toBe(1);
  });

  it('emite las filas visibles tras filtrar (para exportar)', () => {
    let visible: Row[] = [];
    fixture.componentInstance.visibleRowsChange.subscribe((r) => (visible = r));
    (fixture.componentInstance as unknown as { onSearch(v: string): void }).onSearch('Producto 1');
    fixture.detectChanges();
    expect(visible.map((r) => r.id)).toEqual([10, 11, 12]);
  });
});
