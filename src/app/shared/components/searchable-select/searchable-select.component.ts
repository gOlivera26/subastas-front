import { Component, input, output, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface SelectOption {
  value: any;
  label: string;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './searchable-select.component.html',
})
export class SearchableSelectComponent {
  options = input<SelectOption[]>([]);
  label = input<string>('');
  placeholder = input<string>('Buscar...');
  value = input<any>(null);
  valueChange = output<any>();
  nullLabel = input<string>('— Sin selección —');
  showNullOption = input<boolean>(true);

  isOpen = signal(false);
  searchQuery = signal('');

  filteredOptions = computed(() => {
    const q = this.searchQuery().toLowerCase();
    return this.options().filter(o => o.label.toLowerCase().includes(q));
  });

  selectedLabel = computed(() => {
    const val = this.value();
    if (val === null || val === undefined) return this.nullLabel();
    const found = this.options().find(o => o.value === val);
    return found ? found.label : this.nullLabel();
  });

  toggleDropdown() {
    this.isOpen.set(!this.isOpen());
    if (this.isOpen()) this.searchQuery.set('');
  }

  closeDropdown() {
    this.isOpen.set(false);
    this.searchQuery.set('');
  }

  selectOption(option: SelectOption) {
    this.valueChange.emit(option.value);
    this.closeDropdown();
  }

  selectNull() {
    this.valueChange.emit(null);
    this.closeDropdown();
  }

  stopPropagation(event: Event) {
    event.stopPropagation();
  }
}
