import { Component } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-informes-placeholder',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="mb-6 inline-flex size-20 items-center justify-center rounded-2xl border border-[var(--color-charcoal-grey)] bg-[var(--color-deep-slate)]">
        <lucide-icon name="bar-chart" [size]="32" class="text-[var(--color-cyan-spark)]"></lucide-icon>
      </div>
      <h2 class="mb-2 text-[24px] font-[590] text-[var(--color-porcelain)]">Informes</h2>
      <p class="text-[15px] text-[var(--color-storm-cloud)] max-w-md">
        Reportes y análisis de procesos.
        <span class="block mt-2 text-[var(--color-cyan-spark)]">Próximamente...</span>
      </p>
    </div>
  `,
})
export class InformesPlaceholderComponent {}
