import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren, Directive, Input } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { CotizacionService } from '../../../core/services/cotizacion.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-mis-ofertas',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, DataTableComponent, CellTemplateDirective, DatePipe],
  templateUrl: './mis-ofertas.component.html',
})
export class MisOfertasComponent implements OnInit {
  private cotizacionService = inject(CotizacionService);
  private notify = inject(NotificationService);

  ofertas = signal<any[]>([]);
  loading = signal(true);

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach((d: any) => { map[d.cellKey] = d.templateRef; });
    return map;
  });

  columns: TableColumn[] = [
    { key: 'fechaOferta', label: 'Fecha y Hora', width: '180px' },
    { key: 'cotizacion', label: 'Subasta (Nro)', width: '150px' },
    { key: 'detalle', label: 'Bien, Servicio o Lote' },
    { key: 'monto', label: 'Importe Ofertado', align: 'right', width: '180px' },
    { key: 'estado', label: 'Estado', align: 'center', width: '120px' }
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