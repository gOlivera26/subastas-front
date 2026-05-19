import { Component, OnInit, signal, inject, computed, TemplateRef, viewChildren, Directive, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';
import { ProviderService, ProviderListDto, CreateProviderDto, UpdateProviderDto, RubroTreeDto, DomicilioDto, CreateDomicilioDto, UpdateDomicilioDto, TipoDomicilioDto, ProvinciaDto, AfipPersonDataDto } from '../../../core/services/provider.service';
import { DataTableComponent, TableColumn } from '../../../shared/components/data-table';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

@Directive({
  selector: 'ng-template[cellKey]',
  standalone: true,
})
export class CellTemplateDirective {
  @Input({ required: true }) cellKey!: string;
  constructor(public templateRef: TemplateRef<any>) {}
}

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, LucideAngularModule, DataTableComponent, CellTemplateDirective, LoadingSpinnerComponent],
  templateUrl: './proveedores.component.html',
})
export class ProveedoresComponent implements OnInit {
  private providerService = inject(ProviderService);

  providers = signal<ProviderListDto[]>([]);
  loading = signal(false);
  loadingAction = signal<string | null>(null);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  currentPage = signal(1);
  pageSize = signal(10);
  totalRows = signal(0);
  searchTerm = signal('');

  isCreateModalOpen = signal(false);
  isEditModalOpen = signal(false);
  isRubrosModalOpen = signal(false);
  isDomiciliosModalOpen = signal(false);
  isAfipModalOpen = signal(false);

  selectedProvider = signal<ProviderListDto | null>(null);

  createForm = {
    razonSocial: '',
    cuit: '',
    cup: '',
    emailInstitucional: '',
    emailAlternativo: '',
    idTipoPersona: 1,
  };

  editForm = {
    id: 0,
    razonSocial: '',
    cuit: '',
    cup: '',
    emailInstitucional: '',
    emailAlternativo: '',
    idTipoPersona: 1,
  };

  rubrosTree = signal<RubroTreeDto[]>([]);
  rubrosLoading = signal(false);
  selectedRubros = signal<number[]>([]);
  providerRubros = signal<{ idRubro: number; codigo: string; descripcion: string }[]>([]);
  expandedRubros = signal<Set<number>>(new Set());
  rubroSearch = signal('');

  domicilios = signal<DomicilioDto[]>([]);
  domiciliosLoading = signal(false);
  tiposDomicilio = signal<TipoDomicilioDto[]>([]);
  provincias = signal<ProvinciaDto[]>([]);
  domicilioForm = {
    idTipoDomicilio: 0,
    calle: '',
    numero: '',
    piso: '',
    departamento: '',
    barrio: '',
    ciudad: '',
    idProvincia: 0,
    codigoPostal: '',
    telefono: '',
    fax: '',
  };

  afipData = signal<AfipPersonDataDto | null>(null);
  afipCuit = signal('');

  columns: TableColumn[] = [
    { key: 'razonSocial', label: 'Razón Social', sortable: true },
    { key: 'cuit', label: 'CUIT', sortable: true, width: '130px' },
    { key: 'cup', label: 'CUP', width: '80px' },
    { key: 'tipoPersona', label: 'Tipo', align: 'center', width: '80px' },
    { key: 'rubrosCount', label: 'Rubros', align: 'center', width: '70px' },
    { key: 'hasConstanciaAfip', label: 'Constancia AFIP', align: 'center', width: '130px' },
    { key: 'acciones', label: 'Acciones', align: 'right', width: '140px' },
  ];

  cellTemplateDirectives = viewChildren(CellTemplateDirective);
  cellTemplatesMap = computed(() => {
    const map: Record<string, TemplateRef<any>> = {};
    this.cellTemplateDirectives().forEach(d => {
      map[d.cellKey] = d.templateRef;
    });
    return map;
  });

  sortKey = signal<string>('razonSocial');
  sortDirection = signal<'asc' | 'desc'>('asc');

  filteredRubrosTree = computed(() => {
    const search = this.rubroSearch().toLowerCase().trim();
    if (!search) return this.rubrosTree();
    
    const filterNode = (node: RubroTreeDto): RubroTreeDto | null => {
      const matches = node.codigo.toLowerCase().includes(search) || node.descripcion.toLowerCase().includes(search);
      const filteredChildren = node.children
        .map(child => {
          const childMatches = child.codigo.toLowerCase().includes(search) || child.descripcion.toLowerCase().includes(search);
          const filteredGrandchildren = (child.children || [])
            .filter(gc => gc.codigo.toLowerCase().includes(search) || gc.descripcion.toLowerCase().includes(search));
          if (childMatches || filteredGrandchildren.length > 0) {
            return { ...child, children: childMatches ? child.children : filteredGrandchildren };
          }
          return null;
        })
        .filter((c): c is RubroTreeDto => c !== null);
      
      if (matches || filteredChildren.length > 0) {
        return { ...node, children: matches ? node.children : filteredChildren };
      }
      return null;
    };
    
    return this.rubrosTree().map(filterNode).filter((n): n is RubroTreeDto => n !== null);
  });

  isRubroExpanded(rubroId: number): boolean {
    return this.expandedRubros().has(rubroId);
  }

  toggleRubroExpand(rubroId: number) {
    const expanded = new Set(this.expandedRubros());
    if (expanded.has(rubroId)) {
      expanded.delete(rubroId);
    } else {
      expanded.add(rubroId);
    }
    this.expandedRubros.set(expanded);
  }

  onSort(event: { key: string; direction: 'asc' | 'desc' }) {
    this.sortKey.set(event.key);
    this.sortDirection.set(event.direction);
    this.currentPage.set(1);
    this.loadProviders();
  }

  onPageChange(event: { page: number; pageSize: number }) {
    this.currentPage.set(event.page);
    this.pageSize.set(event.pageSize);
    this.loadProviders();
  }

  ngOnInit() {
    this.loadProviders();
  }

  loadProviders() {
    this.loading.set(true);
    this.providerService.getProviders(this.currentPage(), this.pageSize(), this.searchTerm() || undefined, this.sortKey(), this.sortDirection())
      .subscribe({
        next: (res) => {
          if (res.success && res.data) {
            this.providers.set(res.data.data || []);
            this.totalRows.set(res.data.total || 0);
          } else {
            this.providers.set([]);
            this.totalRows.set(0);
          }
          this.loading.set(false);
        },
        error: () => {
          this.error.set('Error al cargar proveedores');
          this.loading.set(false);
        }
      });
  }

  search() {
    this.currentPage.set(1);
    this.loadProviders();
  }

  nextPage() {
    if ((this.currentPage() * this.pageSize()) < this.totalRows()) {
      this.currentPage.update(p => p + 1);
      this.loadProviders();
    }
  }

  prevPage() {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
      this.loadProviders();
    }
  }

  openCreateModal() {
    this.createForm = { razonSocial: '', cuit: '', cup: '', emailInstitucional: '', emailAlternativo: '', idTipoPersona: 1 };
    this.isCreateModalOpen.set(true);
  }

  openEditModal(provider: ProviderListDto) {
    this.editForm = {
      id: provider.id,
      razonSocial: provider.razonSocial,
      cuit: provider.cuit,
      cup: provider.cup,
      emailInstitucional: provider.emailInstitucional,
      emailAlternativo: '',
      idTipoPersona: 1,
    };
    this.isEditModalOpen.set(true);
  }

  createProvider() {
    if (!this.createForm.razonSocial || !this.createForm.cuit || !this.createForm.emailInstitucional) {
      this.error.set('Complete los campos obligatorios');
      return;
    }
    this.loadingAction.set('Creando...');
    this.providerService.createProvider(this.createForm as CreateProviderDto).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Proveedor creado exitosamente');
          this.isCreateModalOpen.set(false);
          this.loadProviders();
        } else {
          this.error.set(res.message);
        }
        this.loadingAction.set(null);
      },
      error: () => {
        this.error.set('Error al crear proveedor');
        this.loadingAction.set(null);
      }
    });
  }

  updateProvider() {
    if (!this.editForm.razonSocial || !this.editForm.cuit || !this.editForm.emailInstitucional) {
      this.error.set('Complete los campos obligatorios');
      return;
    }
    this.loadingAction.set('Actualizando...');
    this.providerService.updateProvider(this.editForm as UpdateProviderDto).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Proveedor actualizado exitosamente');
          this.isEditModalOpen.set(false);
          this.loadProviders();
        } else {
          this.error.set(res.message);
        }
        this.loadingAction.set(null);
      },
      error: () => {
        this.error.set('Error al actualizar proveedor');
        this.loadingAction.set(null);
      }
    });
  }

  openRubrosModal(provider: ProviderListDto) {
    this.selectedProvider.set(provider);
    this.selectedRubros.set([]);
    this.providerRubros.set([]);
    this.expandedRubros.set(new Set());
    this.rubroSearch.set('');
    this.loadRubrosTree();
    this.loadProviderRubros(provider.id);
    this.isRubrosModalOpen.set(true);
  }

  loadRubrosTree() {
    this.rubrosLoading.set(true);
    this.providerService.getRubroTree().subscribe({
      next: (res) => {
        if (res.success && res.data) this.rubrosTree.set(res.data);
        this.rubrosLoading.set(false);
      },
      error: () => this.rubrosLoading.set(false),
    });
  }

  loadProviderRubros(providerId: number) {
    this.providerService.getProviderRubros(providerId).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.providerRubros.set(res.data.map(r => ({ idRubro: r.idRubro, codigo: r.codigo, descripcion: r.descripcion })));
        }
      }
    });
  }

  toggleRubro(rubroId: number) {
    const current = this.selectedRubros();
    if (current.includes(rubroId)) {
      this.selectedRubros.set(current.filter(id => id !== rubroId));
    } else {
      this.selectedRubros.set([...current, rubroId]);
    }
  }

  linkRubros() {
    const provider = this.selectedProvider();
    if (!provider || this.selectedRubros().length === 0) return;
    this.loadingAction.set('Vinculando...');
    this.providerService.linkProviderRubros(provider.id, this.selectedRubros()).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Rubros vinculados');
          this.loadProviderRubros(provider.id);
          this.selectedRubros.set([]);
        } else {
          this.error.set(res.message);
        }
        this.loadingAction.set(null);
      },
      error: () => {
        this.error.set('Error al vincular rubros');
        this.loadingAction.set(null);
      }
    });
  }

  unlinkRubro(rubroId: number) {
    const provider = this.selectedProvider();
    if (!provider) return;
    this.providerService.unlinkProviderRubro(provider.id, rubroId).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Rubro desvinculado');
          this.loadProviderRubros(provider.id);
        }
      }
    });
  }

  openDomiciliosModal(provider: ProviderListDto) {
    this.selectedProvider.set(provider);
    this.domicilios.set([]);
    this.loadDomicilios(1);
    this.loadCatalogos();
    this.isDomiciliosModalOpen.set(true);
  }

  loadDomicilios(personaId: number) {
    this.domiciliosLoading.set(true);
    this.providerService.getDomiciliosByPersona(personaId).subscribe({
      next: (res) => {
        if (res.success && res.data) this.domicilios.set(res.data);
        this.domiciliosLoading.set(false);
      },
      error: () => this.domiciliosLoading.set(false),
    });
  }

  loadCatalogos() {
    this.providerService.getTiposDomicilio().subscribe({
      next: (res) => { if (res.success && res.data) this.tiposDomicilio.set(res.data); }
    });
    this.providerService.getProvincias().subscribe({
      next: (res) => { if (res.success && res.data) this.provincias.set(res.data); }
    });
  }

  createDomicilio() {
    const provider = this.selectedProvider();
    if (!provider) return;
    this.providerService.createDomicilio(1, this.domicilioForm as unknown as CreateDomicilioDto).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Domicilio creado');
          this.loadDomicilios(1);
          this.resetDomicilioForm();
        } else {
          this.error.set(res.message);
        }
      }
    });
  }

  deleteDomicilio(id: number) {
    this.providerService.deleteDomicilio(id).subscribe({
      next: (res) => {
        if (res.success) {
          this.success.set('Domicilio eliminado');
          this.loadDomicilios(1);
        }
      }
    });
  }

  resetDomicilioForm() {
    this.domicilioForm = { idTipoDomicilio: 0, calle: '', numero: '', piso: '', departamento: '', barrio: '', ciudad: '', idProvincia: 0, codigoPostal: '', telefono: '', fax: '' };
  }

  openAfipModal() {
    this.afipCuit.set('');
    this.afipData.set(null);
    this.isAfipModalOpen.set(true);
  }

  verifyAfip() {
    if (!this.afipCuit()) { this.error.set('Ingrese un CUIT'); return; }
    this.loadingAction.set('Verificando...');
    this.providerService.verifyAfipCuit(this.afipCuit()).subscribe({
      next: (res) => {
        if (res.success && res.data) this.afipData.set(res.data);
        else this.error.set(res.message);
        this.loadingAction.set(null);
      },
      error: () => {
        this.error.set('Error al verificar CUIT');
        this.loadingAction.set(null);
      }
    });
  }

  closeModal() {
    this.isCreateModalOpen.set(false);
    this.isEditModalOpen.set(false);
    this.isRubrosModalOpen.set(false);
    this.isDomiciliosModalOpen.set(false);
    this.isAfipModalOpen.set(false);
    this.error.set(null);
    this.success.set(null);
  }

  clearMessages() {
    this.error.set(null);
    this.success.set(null);
  }

  totalPages(): number {
    return Math.ceil(this.totalRows() / this.pageSize()) || 1;
  }
}
