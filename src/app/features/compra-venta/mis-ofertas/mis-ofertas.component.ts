import { Component, OnInit, TemplateRef, computed, inject, signal, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { CotizacionService } from '../../../core/services/cotizacion.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SmartTableComponent } from '../../../shared/ui/smart-table/smart-table';
import { TableColumn } from '../../../shared/ui/smart-table/table.models';

@Component({
  selector: 'app-mis-ofertas',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, SmartTableComponent],
  templateUrl: './mis-ofertas.component.html',
})
export class MisOfertasComponent implements OnInit {
  private cotizacionService = inject(CotizacionService);
  private notify = inject(NotificationService);

  ofertas = signal<any[]>([]);
  loading = signal(true);

  fechaOfertaTpl = viewChild<TemplateRef<any>>('fechaOfertaTpl');
  cotizacionTpl = viewChild<TemplateRef<any>>('cotizacionTpl');
  detalleTpl = viewChild<TemplateRef<any>>('detalleTpl');
  montoTpl = viewChild<TemplateRef<any>>('montoTpl');
  estadoTpl = viewChild<TemplateRef<any>>('estadoTpl');

  customTemplates = computed(() => {
    const templates: Record<string, TemplateRef<any>> = {};
    const fechaOferta = this.fechaOfertaTpl();
    const cotizacion = this.cotizacionTpl();
    const detalle = this.detalleTpl();
    const monto = this.montoTpl();
    const estado = this.estadoTpl();

    if (fechaOferta) templates['fechaOferta'] = fechaOferta;
    if (cotizacion) templates['cotizacion'] = cotizacion;
    if (detalle) templates['detalle'] = detalle;
    if (monto) templates['monto'] = monto;
    if (estado) templates['estado'] = estado;

    return templates;
  });

  columns: TableColumn[] = [
    { header: 'Fecha y Hora', key: 'fechaOferta', type: 'custom', sortable: true },
    { header: 'Subasta (Nro)', key: 'cotizacion', type: 'custom', sortable: true },
    { header: 'Bien, Servicio o Lote', key: 'detalle', type: 'custom', searchFields: ['detalle'] },
    { header: 'Importe Ofertado', key: 'monto', type: 'custom', sortable: true },
    { header: 'Estado', key: 'estado', type: 'custom' }
  ];

  ngOnInit() {
    this.cargarHistorial();
  }

  cargarHistorial() {
    this.loading.set(true);
    this.cotizacionService.getMisOfertas().subscribe({
      next: (res) => {
        this.loading.set(false);
        if (res.success && res.data) {
          this.ofertas.set(res.data);
        } else {
          this.ofertas.set([]);
        }
      },
      error: () => {
        this.loading.set(false);
        this.notify.showError('No se pudo cargar el historial de ofertas.');
      }
    });
  }
}
