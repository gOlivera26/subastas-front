import { Component, OnInit, inject, signal, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { AuthService } from '../../../core/services/auth.service';
import { OrganizationService, Organization } from '../../../core/services/organization.service';
import { ProviderService, ProviderResponse } from '../../../core/services/provider.service';


type RegisterStep = 'form' | 'code' | 'success';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, RouterLink],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private orgService = inject(OrganizationService);
  private providerService = inject(ProviderService);
  private router = inject(Router);

  registerForm: FormGroup;
  organizations = signal<Organization[]>([]);

  // Estados de la UI
  step = signal<RegisterStep>('form');
  isLoading = signal(false);
  isSuccess = signal(false);
  errorMessage = signal<string | null>(null);

  // Lógica de Caminos (Gestor vs Proveedor)
  registrationType = signal<'GESTOR' | 'PROVEEDOR'>('GESTOR');
  isVerifyingCuit = signal(false);
  verifiedProvider = signal<ProviderResponse | null>(null);

  // Paso de código
  registeredEmail = signal('');
  codigo = signal('');
  isConfirming = signal(false);
  isResending = signal(false);
  resendCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.registerForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      nroDocumento: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      idRol: [3],
      idTipoPersona: [1],
      idTipoDocumento: [1],

      // Campos condicionales
      idOrganizacion: [''],
      cuitSearch: [''],
      idProveedor: ['']
    });
  }

  ngOnInit() {
    this.orgService.getActiveOrganizations().subscribe({
      next: (res) => {
        if (res.success) this.organizations.set(res.data);
      },
      error: () => this.errorMessage.set('No se pudieron cargar las organizaciones.')
    });
  }

  ngOnDestroy() {
    this.clearCooldown();
  }

  private clearCooldown() {
    if (this.cooldownInterval) {
      clearInterval(this.cooldownInterval);
      this.cooldownInterval = null;
    }
  }

  private startResendCooldown() {
    this.resendCooldown.set(60);
    this.clearCooldown();
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown.update(v => {
        if (v <= 1) {
          this.clearCooldown();
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }

  setRegistrationType(type: 'GESTOR' | 'PROVEEDOR') {
    this.registrationType.set(type);
    this.errorMessage.set(null);
    this.verifiedProvider.set(null);

    this.registerForm.patchValue({
      idOrganizacion: '',
      cuitSearch: '',
      idProveedor: '',
      idRol: type === 'GESTOR' ? 2 : 3
    });
  }

  verifyCuit() {
    const cuit = this.registerForm.get('cuitSearch')?.value;
    if (!cuit) return;

    this.isVerifyingCuit.set(true);
    this.errorMessage.set(null);

    this.providerService.verifyCuit(cuit).subscribe({
      next: (res) => {
        this.isVerifyingCuit.set(false);
        if (res.success && res.data) {
          this.verifiedProvider.set(res.data);
          this.registerForm.patchValue({ idProveedor: res.data.id });
        }
      },
      error: (err) => {
        this.isVerifyingCuit.set(false);
        this.verifiedProvider.set(null);
        this.registerForm.patchValue({ idProveedor: '' });
        this.errorMessage.set(err.error?.message || 'Error al verificar CUIT.');
      }
    });
  }

  onSubmit() {
    if (this.registrationType() === 'GESTOR' && !this.registerForm.get('idOrganizacion')?.value) {
      this.errorMessage.set('Debe seleccionar una Organización para registrarse.');
      return;
    }

    if (this.registrationType() === 'PROVEEDOR' && !this.registerForm.get('idProveedor')?.value) {
      this.errorMessage.set('Debe verificar un CUIT válido para poder registrarse como Proveedor.');
      return;
    }

    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const payload = { ...this.registerForm.value };
    delete payload.cuitSearch;

    payload.idOrganizacion = payload.idOrganizacion ? Number(payload.idOrganizacion) : null;
    payload.idProveedor = payload.idProveedor ? Number(payload.idProveedor) : null;

    this.authService.register(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.success) {
          this.registeredEmail.set(payload.email);
          this.step.set('code');
          this.startResendCooldown();
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al procesar el registro.');
      }
    });
  }

  onCodigoInput(event: Event) {
    const input = event.target as HTMLInputElement;
    // Solo dígitos, máximo 6
    const soloDigitos = input.value.replace(/\D/g, '').slice(0, 6);
    this.codigo.set(soloDigitos);
    input.value = soloDigitos;

    // Auto-enviar cuando llega a 6 dígitos
    if (soloDigitos.length === 6) {
      this.confirmarCodigo(soloDigitos);
    }
  }

  confirmarCodigo(codigo?: string) {
    const code = codigo || this.codigo();
    if (code.length !== 6) return;

    this.isConfirming.set(true);
    this.errorMessage.set(null);

    this.authService.confirmarEmail(this.registeredEmail(), code).subscribe({
      next: (res) => {
        this.isConfirming.set(false);
        if (res.success) {
          this.step.set('success');
        }
      },
      error: (err) => {
        this.isConfirming.set(false);
        this.errorMessage.set(err.error?.message || 'El código es incorrecto o expiró.');
        this.codigo.set('');
      }
    });
  }

  reenviarCodigo() {
    if (this.resendCooldown() > 0) return;

    this.isResending.set(true);
    this.errorMessage.set(null);

    this.authService.reenviarCodigo(this.registeredEmail()).subscribe({
      next: (res) => {
        this.isResending.set(false);
        if (res.success) {
          this.errorMessage.set(null);
          this.startResendCooldown();
          this.codigo.set('');
        }
      },
      error: (err) => {
        this.isResending.set(false);
        this.errorMessage.set(err.error?.message || 'Error al reenviar el código.');
      }
    });
  }
}
