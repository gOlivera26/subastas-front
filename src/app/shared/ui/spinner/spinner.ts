import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-spinner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg class="animate-spin" [ngClass]="classMap" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  `
})
export class Spinner {
  @Input() size: 'sm' | 'md' | 'lg' = 'md';
  @Input() color: 'brand' | 'white' | 'gray' = 'brand';

  get classMap() {
    const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
    const colors = { brand: 'text-brand-600', white: 'text-white', gray: 'text-gray-500' };
    return `${sizes[this.size]} ${colors[this.color]}`;
  }
}
