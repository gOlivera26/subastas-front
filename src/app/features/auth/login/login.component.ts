import { Component, inject, OnDestroy, signal } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { NgClass } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { interval, Subject, Subscription } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

type LoginState = 'login' | 'forgot-email' | 'forgot-reset';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, LucideAngularModule, NgClass, RouterLink], 
  templateUrl: './login.component.html',
})
export class LoginComponent implements OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // State
  currentState = signal<LoginState>('login');

  // Login form
  loginForm: FormGroup;
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  // Forgot email step
  forgotEmailValue = signal('');
  
  // Forgot reset step
  forgotPasswordForm: FormGroup;
  showNewPassword = signal(false);
  codigoDigits = signal<string[]>(['', '', '', '', '', '']);
  isResetting = signal(false);
  forgotMessage = signal<string | null>(null);
  forgotMessageType = signal<'success' | 'error'>('error');

  // Cooldown
  cooldownRemaining = signal(0);
  private cooldownSub?: Subscription;
  private destroy$ = new Subject<void>();

  get nuevaPasswordControl(): FormControl {
    return this.forgotPasswordForm.get('nuevaPassword') as FormControl;
  }

  constructor() {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });

    this.forgotPasswordForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      nuevaPassword: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  // ── Login ──

  togglePasswordVisibility() {
    this.showPassword.update(val => !val);
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    const { email, password } = this.loginForm.value;

    this.authService.login(email, password).subscribe({
      next: () => {
        this.isLoading.set(false);
        const user = this.authService.currentUser();
        const proveedor = user?.entidades?.find(e => e.tipo === 'PROVEEDOR');
        if (proveedor) {
          this.authService.switchContext(proveedor.tipo, proveedor.id).subscribe();
        } else {
          this.router.navigate(['/modulos']);
        }
      },
      error: (err) => {
        this.isLoading.set(false);

        if (err.error && err.error.message) {
          this.errorMessage.set(err.error.message);
        } else {
          this.errorMessage.set('Error de conexión con el servidor.');
        }
      }
    });
  }

  // ── Forgot Password: email step ──

  onForgotEmailInput(event: Event) {
    const input = event.target as HTMLInputElement;
    this.forgotEmailValue.set(input.value);
  }

  goToForgotEmail(email?: string) {
    this.forgotMessage.set(null);
    const currentEmail = email ?? this.loginForm.get('email')?.value ?? '';
    this.forgotEmailValue.set(currentEmail);
    this.forgotPasswordForm.get('email')?.setValue(currentEmail);
    this.currentState.set('forgot-email');
  }

  goBackToLogin() {
    this.currentState.set('login');
    this.forgotMessage.set(null);
  }

  onSolicitarReset() {
    const email = this.forgotEmailValue().trim();
    if (!email) return;

    this.isLoading.set(true);
    this.forgotMessage.set(null);

    this.authService.solicitarReset(email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.forgotMessage.set('Si el correo está registrado, recibirás un código de verificación.');
        this.forgotMessageType.set('success');
        this.forgotPasswordForm.get('email')?.setValue(email);
        this.currentState.set('forgot-reset');
        this.startCooldown();
      },
      error: (err) => {
        this.isLoading.set(false);
        this.forgotMessageType.set('error');
        this.forgotMessage.set(err.error?.message ?? 'Error al solicitar el reset.');
      }
    });
  }

  // ── Forgot Password: reset step ──

  onCodigoInput(index: number, event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');

    if (value.length > 1) {
      // Pega completa — distribuir dígitos
      const digits = value.split('').slice(0, 6);
      const newDigits = [...this.codigoDigits()];
      for (let i = 0; i < 6; i++) {
        newDigits[i] = digits[i] ?? '';
      }
      this.codigoDigits.set(newDigits);

      // Focus en el último o siguiente vacío
      const nextEmpty = newDigits.findIndex(d => !d);
      const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.codigo-input');
        inputs[focusIndex]?.focus();
      });
      return;
    }

    const newDigits = [...this.codigoDigits()];
    newDigits[index] = value;
    this.codigoDigits.set(newDigits);

    // Auto-advance al siguiente input
    if (value && index < 5) {
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('.codigo-input');
        inputs[index + 1]?.focus();
      });
    }
  }

  onCodigoKeyDown(index: number, event: KeyboardEvent) {
    if (event.key === 'Backspace' && !this.codigoDigits()[index] && index > 0) {
      const inputs = document.querySelectorAll<HTMLInputElement>('.codigo-input');
      inputs[index - 1]?.focus();
    }
  }

  onResetPassword() {
    const codigo = this.codigoDigits().join('');
    if (codigo.length !== 6) return;

    const email = this.forgotPasswordForm.get('email')?.value ?? '';
    const nuevaPassword = this.forgotPasswordForm.get('nuevaPassword')?.value ?? '';

    if (!nuevaPassword || nuevaPassword.length < 6) {
      this.forgotMessage.set('La contraseña debe tener al menos 6 caracteres.');
      this.forgotMessageType.set('error');
      return;
    }

    this.isResetting.set(true);
    this.forgotMessage.set(null);

    this.authService.resetPassword(email, codigo, nuevaPassword).subscribe({
      next: () => {
        this.isResetting.set(false);
        this.forgotMessageType.set('success');
        this.forgotMessage.set('Contraseña actualizada correctamente. Ahora podés iniciar sesión con tu nueva contraseña.');
        // Reset estado después de unos segundos
        setTimeout(() => {
          this.currentState.set('login');
          this.forgotMessage.set(null);
          this.codigoDigits.set(['', '', '', '', '', '']);
          this.forgotPasswordForm.get('nuevaPassword')?.reset();
        }, 3000);
      },
      error: (err) => {
        this.isResetting.set(false);
        this.forgotMessageType.set('error');
        this.forgotMessage.set(err.error?.message ?? 'Error al restablecer la contraseña. El código podría haber expirado.');
      }
    });
  }

  reenviarCodigo() {
    const email = this.forgotPasswordForm.get('email')?.value ?? '';
    if (!email || this.cooldownRemaining() > 0) return;

    this.authService.solicitarReset(email).subscribe({
      next: () => {
        this.forgotMessageType.set('success');
        this.forgotMessage.set('Código reenviado. Revisá tu correo.');
        this.startCooldown();
      },
      error: (err) => {
        this.forgotMessageType.set('error');
        this.forgotMessage.set(err.error?.message ?? 'Error al reenviar el código.');
      }
    });
  }

  toggleNewPasswordVisibility() {
    this.showNewPassword.update(val => !val);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.cooldownSub?.unsubscribe();
  }

  private startCooldown() {
    this.cooldownRemaining.set(60);
    this.cooldownSub?.unsubscribe();
    this.cooldownSub = interval(1000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const current = this.cooldownRemaining();
        if (current <= 1) {
          this.cooldownRemaining.set(0);
          this.cooldownSub?.unsubscribe();
        } else {
          this.cooldownRemaining.set(current - 1);
        }
      });
  }
}