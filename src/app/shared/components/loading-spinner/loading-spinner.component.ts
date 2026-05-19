import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  template: `
  <div class="flex flex-col items-center justify-center py-12" [class]="containerClass">
    <svg viewBox="0 0 40 40" class="w-10 h-10 animate-spin"
         style="animation-duration: 1.5s;" xmlns="http://www.w3.org/2000/svg">
      
      <circle cx="20" cy="20" r="16" fill="none"
        stroke="var(--color-cyan-spark)" stroke-width="1.2" stroke-opacity="0.3"
        stroke-dasharray="45 55" stroke-linecap="round"
        transform="rotate(-90 20 20)"/>

      <g transform="translate(20, 4) rotate(90)">
        <path d="M0,-8 
                 L0.8,-3 
                 L5.5,2 L5.5,3 L1.5,2.5 
                 L1.2,5 
                 L3.5,6.5 L3.5,7.5 L0,7 
                 L-3.5,7.5 L-3.5,6.5 
                 L-1.2,5 
                 L-1.5,2.5 L-5.5,3 L-5.5,2 
                 L-0.8,-3 Z"
              fill="currentColor" 
              stroke="currentColor"
              stroke-linejoin="round"
              stroke-width="0.5"
              class="text-[var(--color-cyan-spark)]"/>
      </g>
    </svg>
    @if (label) {
      <p class="mt-3 text-[13px] font-[510] text-[var(--color-storm-cloud)]">{{ label }}</p>
    }
  </div>
`,
})
export class LoadingSpinnerComponent {
  @Input() label = '';
  @Input() containerClass = '';
}