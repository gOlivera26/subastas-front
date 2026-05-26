import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-mis-ofertas',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="mx-auto max-w-5xl py-12 text-center">
      <div class="mb-8 inline-flex size-16 items-center justify-center rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-deep-slate)]">
        <lucide-icon name="handshake" [size]="28" class="text-[var(--color-cyan-spark)]"></lucide-icon>
      </div>
      <h1 class="mb-3 text-[28px] font-[590] tracking-tight text-[var(--color-porcelain)]">Mis Ofertas</h1>
      <p class="text-[15px] text-[var(--color-storm-cloud)]">Seguimiento de tus ofertas realizadas en subastas.</p>
      <div class="mt-8 rounded-2xl border border-dashed border-[var(--color-charcoal-grey)] bg-[var(--color-graphite)]/30 p-12">
        <lucide-icon name="construction" [size]="32" class="mb-3 text-[var(--color-storm-cloud)]"></lucide-icon>
        <p class="text-[14px] text-[var(--color-storm-cloud)]">Próximamente</p>
      </div>
    </div>
  `
})
export class MisOfertasComponent {}
