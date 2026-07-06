import { CommonModule } from '@angular/common';
import { Component, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { finalize } from 'rxjs';

import { CotizacionService, SubastaDashboard } from '../../../core/services/cotizacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ReporteService } from '../../../core/services/reporte.service';
import { UnidadAdministrativaService } from '../../../core/services/unidad-administrativa.service';
import { VigenciaService } from '../../../core/services/vigencia.service';
import { AppCalendar } from '../../../shared/ui/app-calendar/app-calendar';
import { CustomSelect, SelectOption } from '../../../shared/ui/custom-select/custom-select';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableColumn } from '../../../shared/ui/smart-table/table.models';

type InformeCodigo = 'final-subasta' | 'auditoria' | 'verificacion-doc' | 'subastas-ahorro' | 'directas';
type FormatoInforme = 'pdf' | 'excel';

interface InformeTipo {
  codigo: InformeCodigo;
  titulo: string;
  descripcion: string;
  icono: string;
}

@Component({
  selector: 'app-informes-placeholder',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, CustomSelect, AppCalendar, SmartTableComponent],
  template: `
    <div class="space-y-6">
      <section class="relative overflow-hidden rounded-3xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/60 p-6 shadow-2xl">
        <div class="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_0%,rgba(2,184,204,.18),transparent_38%),radial-gradient(circle_at_80%_20%,rgba(228,242,34,.08),transparent_34%)]"></div>
        <div class="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div class="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--color-cyan-spark)]/20 bg-[var(--color-cyan-spark)]/10 px-3 py-1 text-[11px] font-[700] uppercase tracking-[0.22em] text-[var(--color-cyan-spark)]">
              <lucide-icon name="bar-chart" [size]="14"></lucide-icon>
              Centro de informes
            </div>
            <h1 class="text-[28px] font-[700] tracking-tight text-[var(--color-porcelain)]">Informes de Licitaciones</h1>
            <p class="mt-2 max-w-3xl text-[14px] leading-6 text-[var(--color-storm-cloud)]">
              Panel de reportes globales por filtros: informe final, auditor&iacute;a,
              verificaci&oacute;n documental, detalle/ahorro y subastas directas.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <button (click)="buscar()" class="btn-accent">
              <lucide-icon name="search" [size]="16"></lucide-icon>
              Buscar
            </button>
            <button (click)="limpiar()" class="btn-secondary">
              <lucide-icon name="rotate-ccw" [size]="16"></lucide-icon>
              Limpiar
            </button>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-3 xl:grid-cols-4">
        @for (tipo of tiposInforme; track tipo.codigo) {
          <button type="button" (click)="onTipoInformeChange(tipo.codigo)"
            class="group rounded-2xl border p-4 text-left transition-all"
            [class.border-[var(--color-cyan-spark)]]="tipoInforme() === tipo.codigo"
            [class.bg-[var(--color-cyan-spark)]/10]="tipoInforme() === tipo.codigo"
            [class.border-[var(--color-charcoal-grey)]]="tipoInforme() !== tipo.codigo"
            [class.bg-[var(--color-graphite)]/50]="tipoInforme() !== tipo.codigo">
            <div class="flex items-start gap-3">
              <div class="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-pitch-black)] text-[var(--color-cyan-spark)] ring-1 ring-[var(--color-charcoal-grey)]">
                <lucide-icon [name]="tipo.icono" [size]="19"></lucide-icon>
              </div>
              <div class="min-w-0">
                <p class="text-[13px] font-[750] text-[var(--color-porcelain)]">{{ tipo.titulo }}</p>
                <p class="mt-1 text-[11px] leading-4 text-[var(--color-storm-cloud)]">{{ tipo.descripcion }}</p>
              </div>
            </div>
          </button>
        }
      </section>

      <section class="rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/45 p-5 shadow-xl">
        <div class="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 class="text-[15px] font-[700] text-[var(--color-porcelain)]">Filtros del informe</h2>
            <p class="text-[12px] text-[var(--color-storm-cloud)]">Filtr&aacute; las subastas y gener&aacute; el informe que necesit&aacute;s.</p>
          </div>
          <button (click)="exportarCsv()" [disabled]="itemsFiltrados().length === 0" class="btn-secondary btn-compact disabled:opacity-40">
            <lucide-icon name="download" [size]="15"></lucide-icon>
            Exportar grilla
          </button>
        </div>

        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <app-custom-select label="Formato" [options]="formatoOptions" [(value)]="formato"></app-custom-select>
          <app-custom-select label="Criterio" [options]="criterioOptions" [(value)]="criterio"></app-custom-select>
          <app-custom-select label="Área" [options]="areaOptions()" placeholder="Todas" [(value)]="areaId"></app-custom-select>
          <app-custom-select label="Ejercicio" [options]="vigenciaOptions()" placeholder="Todos" [(value)]="vigenciaId" (valueChange)="buscar()"></app-custom-select>
          <app-custom-select label="Estado" [options]="estadoOptionsDisponibles()" placeholder="Todos" [(value)]="estadoId" (valueChange)="onEstadoChange($event)"></app-custom-select>
          @if (tipoInforme() === 'verificacion-doc') {
            <app-custom-select label="Estado doc." [options]="estadoDocOptions" [(value)]="estadoDoc"></app-custom-select>
          }
          <app-calendar label="Fecha desde" placeholder="dd/MM/yyyy" [(ngModel)]="fechaDesde" />
          <app-calendar label="Fecha hasta" placeholder="dd/MM/yyyy" [(ngModel)]="fechaHasta" />
          @if (tipoInforme() === 'auditoria') {
            <div>
              <label class="mb-1 ml-1 block text-[11px] uppercase tracking-wider text-[var(--color-storm-cloud)]">Nro. Subasta</label>
              <input [(ngModel)]="nroSubasta" (keyup.enter)="buscar()" class="w-full rounded-xl border border-[var(--color-charcoal-grey)] bg-[var(--color-pitch-black)] px-3 py-2.5 text-[13px] text-[var(--color-porcelain)] outline-none focus:border-[var(--color-cyan-spark)]" />
            </div>
          }
          @if (tipoInforme() === 'directas') {
            <div>
              <label class="mb-1 ml-1 block text-[11px] uppercase tracking-wider text-[var(--color-storm-cloud)]">Título</label>
              <input [(ngModel)]="titulo" (keyup.enter)="buscar()" class="w-full rounded-xl border border-[var(--color-charcoal-grey)] bg-[var(--color-pitch-black)] px-3 py-2.5 text-[13px] text-[var(--color-porcelain)] outline-none focus:border-[var(--color-cyan-spark)]" />
            </div>
          }
        </div>
      </section>

      <section class="rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/35 p-4 shadow-xl">
        <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-[15px] font-[700] text-[var(--color-porcelain)]">Subastas encontradas</h2>
            <p class="text-[12px] text-[var(--color-storm-cloud)]">{{ itemsFiltrados().length }} resultado(s) para el informe seleccionado.</p>
          </div>
          <p class="rounded-full bg-[var(--color-pitch-black)] px-3 py-1 text-[11px] font-mono text-[var(--color-fog-grey)]">
            {{ tipoSeleccionado()?.titulo }} &middot; {{ formato() === 'pdf' ? 'PDF' : 'CSV/Excel' }}
          </p>
        </div>

        <app-smart-table
          [data]="itemsFiltrados()"
          [columns]="columns"
          [customTemplates]="customTemplates()"
          [loading]="loading()"
          [pageSize]="8"
          searchPlaceholder="Buscar por número, área, estado o título..."
          emptyMessage="No hay subastas para los filtros seleccionados."
          emptySubMessage="Probá cambiar fechas, área o tipo de informe." />

        <ng-template #estadoTpl let-row>
          <span class="inline-flex rounded-full border px-2 py-1 text-[10px] font-[800] uppercase tracking-wider"
            [class.border-[var(--color-neon-lime)]]="row.idEstado === 40"
            [class.text-[var(--color-neon-lime)]]="row.idEstado === 40"
            [class.border-[var(--color-cyan-spark)]]="row.idEstado !== 40"
            [class.text-[var(--color-cyan-spark)]]="row.idEstado !== 40">
            {{ row.estado }}
          </span>
        </ng-template>

        <ng-template #accionesTpl let-row>
          <button (click)="generar(row)" [disabled]="generatingId() === row.idCotizacion" class="btn-accent btn-compact">
            @if (generatingId() === row.idCotizacion) {
              Generando...
            } @else {
              <lucide-icon [name]="formato() === 'pdf' ? 'file-text' : 'download'" [size]="14"></lucide-icon>
              {{ formato() === 'pdf' ? 'Generar' : 'CSV' }}
            }
          </button>
        </ng-template>
      </section>
    </div>
  `,
})
export class InformesPlaceholderComponent {
  private cotService = inject(CotizacionService);
  private reporteService = inject(ReporteService);
  private notify = inject(NotificationService);
  private uaService = inject(UnidadAdministrativaService);
  private vigenciaService = inject(VigenciaService);

  tipoInforme = signal<InformeCodigo>('final-subasta');
  formato = signal<FormatoInforme>('pdf');
  criterio = signal<number | null>(null);
  areaId = signal<number | null>(null);
  vigenciaId = signal<number | null>(null);
  estadoId = signal<number | null>(null);
  estadoDoc = signal<number | null>(null);
  fechaDesde = signal<string>('');
  fechaHasta = signal<string>('');
  nroSubasta = signal('');
  titulo = signal('');
  loading = signal(false);
  generatingId = signal<number | null>(null);
  items = signal<SubastaDashboard[]>([]);
  areaOptions = signal<SelectOption[]>([]);
  vigenciaOptions = signal<SelectOption[]>([]);

  estadoTpl = viewChild<TemplateRef<any>>('estadoTpl');
  accionesTpl = viewChild<TemplateRef<any>>('accionesTpl');

  tiposInforme: InformeTipo[] = [
    { codigo: 'final-subasta', titulo: 'Informe final de subasta', descripcion: 'Acta final/prelación con resultado y adjudicación.', icono: 'file-badge' },
    { codigo: 'auditoria', titulo: 'Reporte Auditoría', descripcion: 'Trazabilidad y resumen de actividad por subasta.', icono: 'clipboard-list' },
    { codigo: 'verificacion-doc', titulo: 'Verificación documental', descripcion: 'Estado de documentación por ítem/renglón.', icono: 'shield-check' },
    { codigo: 'subastas-ahorro', titulo: 'Subastas / Ahorro', descripcion: 'Detalle económico y resultado de subasta.', icono: 'trending-down' },
    { codigo: 'directas', titulo: 'Subastas directas', descripcion: 'Reporte orientado a contratación directa.', icono: 'activity' },
  ];

  formatoOptions: SelectOption[] = [
    { label: 'PDF', value: 'pdf' },
    { label: 'Excel / CSV', value: 'excel' },
  ];

  criterioOptions: SelectOption[] = [
    { label: 'Todos', value: null },
    { label: 'Renglón', value: 1 },
    { label: 'Ítem', value: 0 },
  ];

  estadoOptions: SelectOption[] = [
    { label: 'Todos', value: null },
    { label: 'Generado', value: 4 },
    { label: 'Enviada Pendiente', value: 39 },
    { label: 'Finalizada', value: 40 },
    { label: 'Anulada', value: 20 },
    { label: 'Desistida', value: 47 },
  ];

  estadoDocOptions: SelectOption[] = [
    { label: 'Todos', value: null },
    { label: 'Verificados', value: 1 },
    { label: 'Rechazados', value: 2 },
  ];

  columns: TableColumn[] = [
    { header: 'Número', key: 'nroCotizacion', sortable: true },
    { header: 'Objeto / Expediente', key: 'titulo', sortable: true, searchFields: ['titulo', 'objetoContratacion', 'nroCotizacion'] },
    { header: 'Tipo', key: 'tipo' },
    { header: 'Área', key: 'unidadAdm' },
    { header: 'Estado', key: 'estado', type: 'custom' },
    { header: 'Inicio', key: 'fechaInicio', type: 'date', sortable: true },
    { header: 'Fin', key: 'fechaFin', type: 'date', sortable: true },
    { header: 'Acción', key: 'acciones', type: 'custom' },
  ];

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const estado = this.estadoTpl();
    const acciones = this.accionesTpl();
    if (estado) templates['estado'] = estado;
    if (acciones) templates['acciones'] = acciones;
    return templates;
  });

  tipoSeleccionado = computed(() => this.tiposInforme.find(t => t.codigo === this.tipoInforme()));

  estadoRequerido = computed(() => {
    const tipo = this.tipoInforme();
    return tipo === 'final-subasta' || tipo === 'auditoria' || tipo === 'subastas-ahorro' || tipo === 'directas'
      ? 40
      : null;
  });

  estadoOptionsDisponibles = computed(() => {
    const requerido = this.estadoRequerido();
    if (requerido == null) return this.estadoOptions;
    return this.estadoOptions.filter(e => e.value === requerido);
  });

  itemsFiltrados = computed(() => {
    const tipo = this.tipoInforme();
    const area = this.areaId();
    const criterio = this.criterio();
    const titulo = this.titulo().trim().toLowerCase();

    return this.items().filter(item => {
      const estadoRequerido = this.estadoRequerido();
      if (estadoRequerido != null && item.idEstado !== estadoRequerido) return false;
      if (tipo === 'directas' && item.idTipoContratacion !== 9) return false;
      if (tipo !== 'directas' && item.idTipoContratacion === 9) return false;
      if (criterio !== null && item.criterioAdjudicacion !== criterio) return false;
      if (area !== null) {
        const rowArea = (item as any).idUnidadAdm ?? (item as any).idUnidadAdministrativa;
        if (rowArea != null && rowArea !== area) return false;
        const areaLabel = this.areaOptions().find(a => a.value === area)?.label?.toLowerCase();
        if (rowArea == null && areaLabel && !(item.unidadAdm || '').toLowerCase().includes(areaLabel)) return false;
      }
      if (tipo === 'auditoria' && this.nroSubasta().trim() && !item.nroCotizacion?.toLowerCase().includes(this.nroSubasta().trim().toLowerCase())) return false;
      if (tipo === 'directas' && titulo && !(item.titulo || item.objetoContratacion || '').toLowerCase().includes(titulo)) return false;
      return true;
    });
  });

  ngOnInit() {
    this.loadAreas();
    this.loadVigencias();
    this.aplicarCriteriosDelInforme();
    this.buscar();
  }

  loadAreas() {
    this.uaService.getAll().subscribe({
      next: (r: any) => {
        if (r?.success) {
          this.areaOptions.set([
            { label: 'Todas', value: null },
            ...(r.data || []).map((ua: any) => ({ label: ua.nombreUnidadAdm, value: ua.idUnidadAdm }))
          ]);
        }
      }
    });
  }

  loadVigencias() {
    this.vigenciaService.getAll().subscribe({
      next: (r: any) => {
        if (r?.success) {
          const vigencias = [...(r.data || [])].sort((a: any, b: any) => b.ejercicio - a.ejercicio);
          this.vigenciaOptions.set([
            { label: 'Todos', value: null },
            ...vigencias.map((v: any) => ({ label: `Ejercicio ${v.ejercicio}${v.activoEjecucion ? ' (Activo)' : ''}`, value: v.idVigencia }))
          ]);
          const activa = vigencias.find((v: any) => v.activoEjecucion);
          if (activa && this.vigenciaId() == null) this.vigenciaId.set(activa.idVigencia);
        }
      }
    });
  }

  onTipoInformeChange(tipo: InformeCodigo) {
    this.tipoInforme.set(tipo);
    this.aplicarCriteriosDelInforme();
    this.buscar();
  }

  onEstadoChange(value: number | null) {
    const requerido = this.estadoRequerido();
    if (requerido != null && value !== requerido) {
      this.estadoId.set(requerido);
    }
    this.buscar();
  }

  private aplicarCriteriosDelInforme() {
    const requerido = this.estadoRequerido();
    if (requerido != null) {
      this.estadoId.set(requerido);
    }
  }

  buscar() {
    this.loading.set(true);
    const estado = this.estadoRequerido() ?? this.estadoId();
    this.cotService.buscar({
      idVigencia: this.vigenciaId() ?? undefined,
      idEstado: estado ?? undefined,
      idTipoContratacion: this.tipoInforme() === 'directas' ? 9 : undefined,
      nro: this.nroSubasta().trim() || undefined,
      fechaDesde: this.fechaDesde() || undefined,
      fechaHasta: this.fechaHasta() || undefined,
    }).pipe(finalize(() => this.loading.set(false))).subscribe({
      next: (r: any) => {
        if (r?.success) this.items.set(r.data || []);
        else this.items.set([]);
      },
      error: () => {
        this.items.set([]);
        this.notify.showError('No se pudieron recuperar las subastas para informes.');
      }
    });
  }

  limpiar() {
    this.tipoInforme.set('final-subasta');
    this.formato.set('pdf');
    this.criterio.set(null);
    this.areaId.set(null);
    this.estadoId.set(40);
    this.estadoDoc.set(null);
    this.fechaDesde.set('');
    this.fechaHasta.set('');
    this.nroSubasta.set('');
    this.titulo.set('');
    this.buscar();
  }

  generar(row: SubastaDashboard) {
    if (this.formato() === 'excel') {
      this.exportarCsv([row]);
      return;
    }

    this.generatingId.set(row.idCotizacion);
    const request$ = this.getReportePdf(row.idCotizacion);
    request$.pipe(finalize(() => this.generatingId.set(null))).subscribe({
      next: (blob) => this.reporteService.abrirPdf(blob),
      error: (err) => this.notify.showError(err.error?.message || 'No se pudo generar el informe seleccionado.')
    });
  }

  private getReportePdf(idCotizacion: number) {
    switch (this.tipoInforme()) {
      case 'final-subasta':
        return this.reporteService.descargarActaPrelacion(idCotizacion);
      case 'auditoria':
        return this.reporteService.descargarAuditoriaSubasta(idCotizacion);
      case 'verificacion-doc':
        return this.reporteService.descargarVerificacionDocumentacion(idCotizacion);
      case 'subastas-ahorro':
      case 'directas':
      default:
        return this.reporteService.descargarDetalleSubasta(idCotizacion);
    }
  }

  exportarCsv(rows = this.itemsFiltrados()) {
    if (!rows.length) {
      this.notify.showWarning('No hay datos para exportar.');
      return;
    }

    const headers = ['Nro Subasta', 'Tipo', 'Estado', 'Área', 'Título', 'Inicio', 'Fin', 'Ofertas'];
    const csvRows = rows.map(row => [
      row.nroCotizacion,
      row.tipo,
      row.estado,
      row.unidadAdm || '',
      row.titulo || row.objetoContratacion || '',
      row.fechaInicio || '',
      row.fechaFin || '',
      row.cantOfertas ?? 0,
    ]);

    const csv = [headers, ...csvRows]
      .map(cols => cols.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `informe-licitaciones-${this.tipoInforme()}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

