import { Component, OnInit, inject, signal, computed, TemplateRef, viewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { CellTemplateDirective } from '../../../shared/directives/cell-template.directive';
import { ConfirmationModal } from '../../../shared/ui/confirmation-modal/confirmation-modal';
import { SearchableSelectComponent, SelectOption } from '../../../shared/components/searchable-select/searchable-select.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ReservaService } from '../../../core/services/reserva.service';
import {
  Reserva, ReservaRequest, ReservaDetalle, ReservaDetalleRequest, BienFormState,
  FiltrosReserva, UnidadAdministrativa, SubResponsable, Vigencia, EstadoReserva, Bien, Moneda
} from '../../../core/models/reserva.model';

interface CatProgNode {
  idCatProg: number;
  idCatProgRel?: number;
  codigo: number;
  nombre: string;
  hasChildren: boolean;
  children: CatProgNode[];
  [key: string]: any;
}

@Component({
  selector: 'app-nota-pedido',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective, ConfirmationModal, SearchableSelectComponent, LoadingSpinnerComponent],
  templateUrl: './nota-pedido.component.html',
})
export class NotaPedidoComponent implements OnInit {
  private reservaService = inject(ReservaService);

  // Estado principal
  reservas = signal<Reserva[]>([]);
  isLoading = signal(true);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  // Sorting
  sortKey = signal<string>('nroReserva');
  sortDirection = signal<'asc' | 'desc'>('desc');

  // Filtros
  filtros = signal<FiltrosReserva>({});
  unidadesAdm = signal<UnidadAdministrativa[]>([]);
  vigencias = signal<Vigencia[]>([]);
  estados = signal<EstadoReserva[]>([]);

  // Modal Nueva/Editar
  isModalOpen = signal(false);
  isEditing = signal(false);
  isSaving = signal(false);
  editingId = signal<number | null>(null);
  form: ReservaRequest = this.getEmptyForm();
  oficinas = signal<SubResponsable[]>([]);

  // Modal Detalle Lectura
  isDetailOpen = signal(false);
  selectedReserva = signal<Reserva | null>(null);
  detalles = signal<ReservaDetalle[]>([]);
  isLoadingDetalles = signal(false);

  // Modales de Confirmación (Autorizar / Clonar)
  reservaToClone = signal<Reserva | null>(null);
  isCloning = signal(false);
  
  reservaToAuthorize = signal<Reserva | null>(null);
  isAuthorizing = signal(false);
  autorizarMotivo = signal<string>(''); 

  // Modal Listado de Ítems (Intermedio)
  isItemsListOpen = signal(false);

  // Modal Formulario de Bienes
  isBienModalOpen = signal(false);
  isEditingBien = signal(false);
  editingBienId = signal<number | null>(null);
  bienForm = this.getEmptyBienForm();
  isSavingBien = signal(false);
  bienErrorMessage = signal<string | null>(null);

  // Catálogos auxiliares
  catalogos = signal<Bien[]>([]);
  monedas = signal<Moneda[]>([]);
  categoriasProg = signal<any[]>([]);
  catalogosLoaded = signal(false);

  // --- NUEVOS MODALES DE BÚSQUEDA ---
  isSelectCatProgModalOpen = signal(false);
  isSelectBienModalOpen = signal(false);
  catProgSearch = signal('');
  bienSearch = signal('');
  expandedCatProg = signal<Set<number>>(new Set());

  // Lógica Árbol Categorías Programáticas
  treeCatProg = computed(() => {
    const flat = this.categoriasProg();
    const map = new Map<number, CatProgNode>();
    for (const item of flat) { map.set(item.idCatProg, { ...item, hasChildren: false, children: [] }); }

    const roots: CatProgNode[] = [];
    for (const [, node] of map) {
      if (node.idCatProgRel != null && map.has(node.idCatProgRel)) {
        map.get(node.idCatProgRel)!.children.push(node);
        map.get(node.idCatProgRel)!.hasChildren = true;
      } else {
        roots.push(node);
      }
    }
    return roots;
  });

  filteredCatProgTree = computed(() => {
    const term = this.catProgSearch().toLowerCase().trim();
    if (!term) return this.treeCatProg();
    return this.filterCatProgTree(this.treeCatProg(), term);
  });

  filterCatProgTree(nodes: CatProgNode[], term: string): CatProgNode[] {
    return nodes.map(node => {
      const matches = node.nombre.toLowerCase().includes(term) || String(node.codigo).includes(term);
      const filteredChildren = this.filterCatProgTree(node.children, term);
      if (matches || filteredChildren.length > 0) return { ...node, children: filteredChildren };
      return null;
    }).filter((n): n is CatProgNode => n !== null);
  }

  toggleCatProgNode(id: number, event: Event) {
    event.stopPropagation();
    const expanded = new Set(this.expandedCatProg());
    if (expanded.has(id)) { expanded.delete(id); } else { expanded.add(id); }
    this.expandedCatProg.set(expanded);
  }

  isCatProgExpanded(id: number): boolean { 
    return this.expandedCatProg().has(id); 
  }

  // Búsqueda de Bienes
  filteredBienesList = computed(() => {
    const search = this.bienSearch().toLowerCase().trim();
    if (!search) return this.catalogos();
    return this.catalogos().filter(b =>
      b.codigo?.toString().includes(search) || b.nItem?.toLowerCase().includes(search)
    );
  });

  // Eliminación de ítem
  bienToDelete = signal<ReservaDetalle | null>(null);

  // Total general calculado
  totalGeneral = computed(() => {
    return this.detalles().reduce((sum, d) => sum + ((d.cantidad || 0) * (d.importe || 0)), 0);
  });

  monedaOptions = computed<SelectOption[]>(() => {
    return this.monedas().map(m => ({ value: m.idMoneda, label: m.nombre }));
  });

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => { map[d.cellKey] = d.templateRef; });
    return map;
  });

  columns: TableColumn[] = [
    { key: 'nroReserva', label: 'Número', sortable: true, width: '120px' },
    { key: 'nombreUnidadAdm', label: 'Área', sortable: true },
    { key: 'nombreSubResponsable', label: 'Oficina Solicitante', sortable: true }, 
    { key: 'descripcionEstado', label: 'Estado', sortable: true, width: '120px' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '140px' },
  ];

  ngOnInit() {
    this.loadReservas();
    this.loadAuxiliares();
  }

  getEmptyForm(): ReservaRequest {
    const today = new Date().toISOString().split('T')[0];
    return { idUnidadAdm: 0, idSubResponsable: 0, fechaReserva: today };
  }

  getEmptyBienForm(): BienFormState {
    return {
      idCatProg: undefined, idItem: undefined, nombreBienSeleccionado: '',
      idMoneda: undefined, idObjetoGasto: undefined,
      cantidad: undefined, importe: undefined, importeFuturo: undefined,
      especificacionesTecnicas: '', fechaEntrega: undefined,
      plazoEntregaDesde: undefined, plazoEntregaHasta: undefined
    };
  }

  loadReservas() {
    this.isLoading.set(true);
    this.reservaService.getAll(this.filtros()).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success && res.data) {
          this.reservas.set(res.data);
          this.sortReservas();
        } else { this.reservas.set([]); }
      },
      error: () => { this.isLoading.set(false); this.reservas.set([]); this.errorMessage.set('Error al cargar las notas de pedido.'); }
    });
  }

  loadAuxiliares() {
    this.reservaService.getUnidadesAdministrativas().subscribe({
      next: (res) => { if (res.success && res.data) this.unidadesAdm.set(res.data); }
    });
    this.reservaService.getVigencias().subscribe({
      next: (res) => { if (res.success && res.data) this.vigencias.set(res.data); }
    });
    this.reservaService.getEstados().subscribe({
      next: (res) => { if (res.success && res.data) this.estados.set(res.data); }
    });
  }

  onFilterUnidadAdmChange(idUA: number) {
    this.filtros.update(f => ({ ...f, idUnidadAdm: idUA || undefined }));
  }

  onModalUnidadAdmChange(idUA: number) {
    this.form.idSubResponsable = 0;
    if (idUA) {
      this.reservaService.getSubResponsables(idUA).subscribe({
        next: (res) => { this.oficinas.set(res.success && res.data ? res.data : []); }
      });
    } else {
      this.oficinas.set([]);
    }
  }

  buscar() { this.loadReservas(); }

  onSort(event: { key: string; direction: 'asc' | 'desc' }) {
    this.sortKey.set(event.key);
    this.sortDirection.set(event.direction);
    this.sortReservas();
  }

  sortReservas() {
    const key = this.sortKey();
    const dir = this.sortDirection();
    const sorted = [...this.reservas()].sort((a, b) => {
      const valA = (a as any)[key] ?? '';
      const valB = (b as any)[key] ?? '';
      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });
    this.reservas.set(sorted);
  }

  limpiarFiltros() {
    this.filtros.set({});
    this.loadReservas();
  }

  openCreateModal() {
    this.isEditing.set(false);
    this.editingId.set(null);
    this.form = this.getEmptyForm();
    this.errorMessage.set(null); 
    this.oficinas.set([]);
    this.isModalOpen.set(true);
  }

  closeModal() { 
    this.isModalOpen.set(false); 
    this.errorMessage.set(null);
  }

  save() {
    if (!this.form.idUnidadAdm || !this.form.idSubResponsable) {
      this.errorMessage.set('Por favor, selecciona el Área Solicitante y la Oficina Responsable antes de guardar.');
      setTimeout(() => this.errorMessage.set(null), 4000);
      return;
    }

    this.isSaving.set(true);
    const obs = this.isEditing() && this.editingId() != null
      ? this.reservaService.update(this.editingId()!, this.form)
      : this.reservaService.create(this.form);
      
    obs.subscribe({
      next: (res) => {
        this.isSaving.set(false);
        if (res.success) {
          this.closeModal();
          this.showSuccess(this.isEditing() ? 'Nota de pedido actualizada.' : 'Nota de pedido creada.');
          this.loadReservas();
        } else {
          this.errorMessage.set(res.message || 'Error al guardar.');
        }
      },
      error: (err) => { 
        this.isSaving.set(false); 
        this.errorMessage.set(err.error?.message || 'Error al guardar la nota de pedido.'); 
      }
    });
  }

  verDetalle(reserva: Reserva) {
    this.selectedReserva.set(reserva);
    this.isDetailOpen.set(true);
    this.loadDetalles(reserva.idReserva);
  }

  closeDetail() { 
    this.isDetailOpen.set(false); 
    this.selectedReserva.set(null); 
    this.detalles.set([]); 
  }

  // --- LISTADO DE ÍTEMS INTERMEDIO ---
  openItemsList(reserva: Reserva) {
    this.selectedReserva.set(reserva);
    this.isItemsListOpen.set(true);
    this.loadDetalles(reserva.idReserva);
  }

  closeItemsList() {
    this.isItemsListOpen.set(false);
    this.selectedReserva.set(null);
    this.detalles.set([]);
  }

  loadDetalles(reservaId: number) {
    this.isLoadingDetalles.set(true);
    this.reservaService.getDetalleByReservaId(reservaId).subscribe({
      next: (res) => {
        this.isLoadingDetalles.set(false);
        if (res.success && res.data) { this.detalles.set(res.data); }
        else { this.detalles.set([]); }
      },
      error: () => { this.isLoadingDetalles.set(false); this.detalles.set([]); }
    });
  }

  loadCatalogosBien() {
    if (this.catalogosLoaded()) return;
    this.reservaService.getBienes().subscribe({
      next: (res) => { if (res.success && res.data) this.catalogos.set(res.data); }
    });
    this.reservaService.getMonedas().subscribe({
      next: (res) => { if (res.success && res.data) this.monedas.set(res.data); }
    });
    this.reservaService.getCategoriasProgramaticas().subscribe({
      next: (res) => { if (res.success && res.data) this.categoriasProg.set(res.data); }
    });
    this.catalogosLoaded.set(true);
  }

  // --- FORMULARIO DE BIEN (Y MODALES SELECTORES) ---
  openBienModal() {
    this.isEditingBien.set(false);
    this.editingBienId.set(null);
    this.bienForm = this.getEmptyBienForm();
    this.bienErrorMessage.set(null);
    this.loadCatalogosBien();
    this.isBienModalOpen.set(true);
  }

  editBien(detalle: ReservaDetalle) {
    this.isEditingBien.set(true);
    this.editingBienId.set(detalle.idReservaDet || null);
    this.bienForm = {
      idCatProg: detalle.idCatProg,
      idItem: detalle.idItem,
      nombreBienSeleccionado: detalle.nombreBien || '',
      idMoneda: detalle.idMoneda,
      idObjetoGasto: undefined,
      cantidad: detalle.cantidad,
      importe: detalle.importe,
      importeFuturo: detalle.importeFuturo,
      especificacionesTecnicas: detalle.especificacionesTecnicas || '',
      fechaEntrega: detalle.fechaEntrega,
      plazoEntregaDesde: detalle.plazoEntregaDesde,
      plazoEntregaHasta: detalle.plazoEntregaHasta
    };
    this.bienErrorMessage.set(null);
    this.loadCatalogosBien();
    this.isBienModalOpen.set(true);
  }

  closeBienModal() {
    this.isBienModalOpen.set(false);
    this.bienErrorMessage.set(null);
  }

  // Modales custom para CatProg y Bienes
  openSelectCatProg() {
    this.catProgSearch.set('');
    this.isSelectCatProgModalOpen.set(true);
  }

  selectCatProg(cat: CatProgNode) {
    this.bienForm.idCatProg = cat.idCatProg;
    this.isSelectCatProgModalOpen.set(false);
  }

  clearCatProg() { this.bienForm.idCatProg = undefined; }

  getSelectedCatProgName(): string {
    if (!this.bienForm.idCatProg) return '— Sin selección —';
    const cat = this.categoriasProg().find(c => c.idCatProg === this.bienForm.idCatProg);
    return cat ? `${cat.codigo} - ${cat.nombre}` : '— Sin selección —';
  }

  openSelectBien() {
    this.bienSearch.set('');
    this.isSelectBienModalOpen.set(true);
  }

  selectBien(bien: Bien) {
    this.bienForm.idItem = bien.idItem;
    this.bienForm.nombreBienSeleccionado = bien.nItem;
    this.isSelectBienModalOpen.set(false);
  }

  clearBien() {
    this.bienForm.idItem = undefined;
    this.bienForm.nombreBienSeleccionado = '';
  }

  getSelectedBienName(): string {
    if (!this.bienForm.idItem) return '— Sin selección —';
    const bien = this.catalogos().find(b => b.idItem === this.bienForm.idItem);
    return bien ? `${bien.codigo} - ${bien.nItem}` : '— Sin selección —';
  }

  saveBien() {
    const form = this.bienForm;
    if (!form.idItem || !form.cantidad || form.cantidad <= 0 || (form.importe === undefined || form.importe < 0)) {
      this.bienErrorMessage.set('Seleccioná un bien e ingresá cantidad e importe válidos.');
      return;
    }

    const reserva = this.selectedReserva();
    if (!reserva) return;

    const dto: ReservaDetalleRequest = {
      idReserva: reserva.idReserva,
      idCatProg: form.idCatProg,
      idItem: form.idItem,
      idMoneda: form.idMoneda,
      idObjetoGasto: form.idObjetoGasto,
      cantidad: form.cantidad,
      importe: form.importe,
      importeFuturo: form.importeFuturo,
      especificacionesTecnicas: form.especificacionesTecnicas,
      fechaEntrega: form.fechaEntrega,
      plazoEntregaDesde: form.plazoEntregaDesde,
      plazoEntregaHasta: form.plazoEntregaHasta
    };

    this.isSavingBien.set(true);
    const obs = this.isEditingBien() && this.editingBienId() != null
      ? this.reservaService.updateDetalle(this.editingBienId()!, dto)
      : this.reservaService.createDetalle(dto);

    obs.subscribe({
      next: (res) => {
        this.isSavingBien.set(false);
        if (res.success) {
          this.closeBienModal();
          this.loadDetalles(reserva.idReserva);
          this.showSuccess(this.isEditingBien() ? 'Ítem actualizado correctamente.' : 'Ítem creado correctamente.');
        } else {
          this.bienErrorMessage.set(res.message || 'Error al guardar el ítem.');
        }
      },
      error: () => {
        this.isSavingBien.set(false);
        this.bienErrorMessage.set('Error al guardar el ítem.');
      }
    });
  }

  deleteBien(detalle: ReservaDetalle) {
    this.bienToDelete.set(detalle);
  }

  confirmDelete() {
    const detalle = this.bienToDelete();
    if (!detalle || !detalle.idReservaDet) return;
    const reserva = this.selectedReserva();
    if (!reserva) return;

    this.reservaService.deleteDetalle(detalle.idReservaDet).subscribe({
      next: (res) => {
        if (res.success) {
          this.bienToDelete.set(null);
          this.loadDetalles(reserva.idReserva);
          this.showSuccess('Ítem eliminado correctamente.');
        } else {
          this.errorMessage.set(res.message || 'Error al eliminar el ítem.');
        }
      },
      error: () => { this.errorMessage.set('Error al eliminar el ítem.'); }
    });
  }

  // --- CONFIRMAR CLONADO ---
  openCloneModal(reserva: Reserva) {
    this.reservaToClone.set(reserva);
  }

  closeCloneModal() {
    if (this.isCloning()) return;
    this.reservaToClone.set(null);
  }

  confirmClone() {
    const reserva = this.reservaToClone();
    if (!reserva) return;

    this.isCloning.set(true);
    this.reservaService.clonar(reserva.idReserva).subscribe({
      next: (res) => {
        this.isCloning.set(false);
        if (res.success) {
          this.closeCloneModal();
          this.showSuccess('Operación realizada con éxito.');
          this.loadReservas();
        } else {
          this.errorMessage.set(res.message || 'Error al clonar.');
          this.closeCloneModal();
        }
      },
      error: () => {
        this.isCloning.set(false);
        this.errorMessage.set('Error al clonar la nota de pedido.');
        this.closeCloneModal();
      }
    });
  }

  // --- CONFIRMAR AUTORIZACIÓN ---
  openAuthorizeModal(reserva: Reserva) {
    this.reservaToAuthorize.set(reserva);
    this.autorizarMotivo.set(''); // Reseteamos el motivo
  }

  closeAuthorizeModal() {
    if (this.isAuthorizing()) return;
    this.reservaToAuthorize.set(null);
    this.autorizarMotivo.set('');
  }

  confirmAuthorize() {
    const reserva = this.reservaToAuthorize();
    const motivo = this.autorizarMotivo().trim();
    
    if (!reserva || !motivo) return;

    this.isAuthorizing.set(true);
    this.reservaService.autorizar(reserva.idReserva, motivo).subscribe({
      next: (res) => {
        this.isAuthorizing.set(false);
        if (res.success) {
          this.closeAuthorizeModal();
          this.showSuccess('Operación realizada con éxito.');
          this.loadReservas();
        } else {
          this.errorMessage.set(res.message || 'Error al autorizar. Verificá que tenga al menos un ítem.');
          this.closeAuthorizeModal();
        }
      },
      error: () => {
        this.isAuthorizing.set(false);
        this.errorMessage.set('Error al autorizar la nota de pedido.');
        this.closeAuthorizeModal();
      }
    });
  }

  trackByCatProgFn(index: number, item: CatProgNode): number { 
    return item.idCatProg; 
  }

  private showSuccess(msg: string) {
    this.successMessage.set(msg);
    setTimeout(() => this.successMessage.set(null), 3000);
  }
}