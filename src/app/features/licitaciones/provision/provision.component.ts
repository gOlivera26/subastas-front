import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-provision',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-6 inline-flex size-20 items-center justify-center rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-deep-slate)]">
        <lucide-icon name="file-text" [size]="32" class="text-[var(--color-neon-lime)]"></lucide-icon>
      </div>
      <h2 class="mb-2 text-[24px] font-[590] text-[var(--color-porcelain)]">Nota de Pedido</h2>
      <p class="text-[15px] text-[var(--color-storm-cloud)] max-w-md">
        Módulo de gestión de reservas y notas de pedido.
        <span class="block mt-2 text-[var(--color-cyan-spark)]">En desarrollo...</span>
      </p>
    </div>
  `,
})
export class ProvisionComponent {}
