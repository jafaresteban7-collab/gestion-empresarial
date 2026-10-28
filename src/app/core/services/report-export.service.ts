import { Injectable, inject } from '@angular/core';
import { TableColumn, cellText } from '../../shared/models/table-column';
import { AuthService } from '../auth/auth.service';

/** Metadatos de un informe exportado. */
export interface ReportOptions<T> {
  /** Título del informe. */
  title: string;
  /** Nombre base del archivo (sin extensión). */
  filename: string;
  columns: TableColumn<T>[];
  rows: T[];
  /** Línea descriptiva opcional (p. ej. filtros aplicados). */
  subtitle?: string;
  /** Pares etiqueta/valor que se muestran como resumen bajo el título. */
  summary?: { label: string; value: string }[];
}

/**
 * Convierte filas en texto CSV (RFC 4180): separador `;` (Excel en español),
 * comillas dobles escapadas y saltos de línea CRLF.
 */
export function toCsv<T>(columns: TableColumn<T>[], rows: T[]): string {
  const escape = (text: string) => (/[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text);
  const header = columns.map((c) => escape(c.label)).join(';');
  const lines = rows.map((row) => columns.map((c) => escape(cellText(c, row))).join(';'));
  return [header, ...lines].join('\r\n');
}

/**
 * Servicio de generación y descarga de informes tabulados en PDF y CSV.
 * Las librerías de PDF se cargan bajo demanda (import dinámico) para no
 * penalizar el tamaño del bundle inicial.
 */
@Injectable({ providedIn: 'root' })
export class ReportExportService {
  private readonly auth = inject(AuthService);

  /** Genera y descarga un CSV (con BOM UTF-8 para que Excel muestre bien las tildes). */
  downloadCsv<T>(options: ReportOptions<T>): void {
    const csv = '﻿' + toCsv(options.columns, options.rows);
    this.download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `${options.filename}.csv`);
  }

  /** Genera y descarga un PDF maquetado con cabecera, resumen, tabla y pie paginado. */
  async downloadPdf<T>(options: ReportOptions<T>): Promise<void> {
    const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const doc = new jsPDF({ orientation: options.columns.length > 5 ? 'landscape' : 'portrait', unit: 'mm' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const generated = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short' }).format(new Date());

    // Cabecera corporativa
    doc.setFillColor(11, 58, 140);
    doc.rect(0, 0, pageWidth, 24, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('GestiónPro', 14, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('Sistema de gestión de inventario y pedidos', 14, 18);

    // Título y metadatos
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text(options.title, 14, 34);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    const author = this.auth.user()?.name ?? 'Usuario';
    doc.text(`Generado el ${generated} por ${author} · ${options.rows.length} registros`, 14, 40);
    let y = 46;
    if (options.subtitle) {
      doc.text(options.subtitle, 14, y);
      y += 6;
    }

    // Bloque de resumen
    if (options.summary?.length) {
      const boxWidth = (pageWidth - 28 - (options.summary.length - 1) * 4) / options.summary.length;
      options.summary.forEach((item, i) => {
        const x = 14 + i * (boxWidth + 4);
        doc.setFillColor(232, 238, 251);
        doc.roundedRect(x, y, boxWidth, 16, 2, 2, 'F');
        doc.setFontSize(8);
        doc.setTextColor(60, 60, 60);
        doc.text(item.label, x + 3, y + 6);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(11, 58, 140);
        doc.text(item.value, x + 3, y + 12.5);
        doc.setFont('helvetica', 'normal');
      });
      y += 22;
    }

    autoTable(doc, {
      startY: y,
      head: [options.columns.map((c) => c.label)],
      body: options.rows.map((row) => options.columns.map((c) => cellText(c, row))),
      theme: 'striped',
      headStyles: { fillColor: [11, 58, 140], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [244, 247, 253] },
      styles: { fontSize: 8.5, cellPadding: 2.2 },
      columnStyles: Object.fromEntries(
        options.columns.map((c, i) => [i, { halign: c.align === 'end' ? 'right' : 'left' }]),
      ),
      margin: { left: 14, right: 14, bottom: 16 },
      didDrawPage: () => {
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(110, 110, 110);
        doc.text('Documento generado con datos sintéticos de prueba.', 14, pageHeight - 8);
        doc.text(`Página ${doc.getNumberOfPages()}`, pageWidth - 14, pageHeight - 8, { align: 'right' });
      },
    });

    doc.setProperties({ title: options.title, author, creator: 'GestiónPro' });
    this.download(doc.output('blob'), `${options.filename}.pdf`);
  }

  private download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
