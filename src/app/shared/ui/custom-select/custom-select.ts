import { Component, EventEmitter, Input, Output, signal, ElementRef, HostListener, inject, computed, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

export interface SelectOption {
  label: string;
  value: any;
  disabled?: boolean;
}

@Component({
  selector: 'app-custom-select',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './custom-select.html',
})
export class CustomSelect {
  @HostBinding('style.position') get hostPosition() {
    return this.isOpen() ? 'relative' : 'static';
  }

  @HostBinding('style.zIndex') get hostZIndex() {
    return this.isOpen() ? '9999' : 'auto';
  }

  @Input() label = '';
  @Input() placeholder = 'Seleccione...';
  @Input() disabled: boolean = false;

  private _options = signal<SelectOption[]>([]);

  @Input() set options(val: SelectOption[]) {
    this._options.set(val || []);
  }

  get options() { return this._options(); }

  @Input() multi = false;
  @Input() value: any | any[] = null;
  @Output() valueChange = new EventEmitter<any>();

  isOpen = signal(false);
  searchTerm = signal('');
  dropdownPosition = signal<'top' | 'bottom'>('bottom');

  private elementRef = inject(ElementRef);

  filteredOptions = computed(() => {
    const list = this._options();
    const term = this.searchTerm().toLowerCase();
    if (!term) return list;
    return list.filter(opt => opt.label.toLowerCase().includes(term));
  });

  get selectedLabel(): string {
    const currentOptions = this._options();
    if (this.multi) {
      if (!Array.isArray(this.value) || this.value.length === 0) return '';
      if (this.value.length === 1) {
        return currentOptions.find(o => o.value === this.value[0])?.label || '';
      }
      return `${this.value.length} seleccionados`;
    }
    const selected = currentOptions.find(o => o.value === this.value);
    return selected ? selected.label : '';
  }

  toggle() {
    if (this.disabled) return;
    if (this._options().length > 0) {
      if (!this.isOpen()) {
        this.calculatePosition();
        this.searchTerm.set('');
      }
      this.isOpen.update(v => !v);
    }
  }

  private calculatePosition() {
    const element = this.elementRef.nativeElement;
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const spaceBelow = windowHeight - rect.bottom;
    const requiredSpace = 320;
    if (spaceBelow < requiredSpace) {
      this.dropdownPosition.set('top');
    } else {
      this.dropdownPosition.set('bottom');
    }
  }

  close() {
    this.isOpen.set(false);
  }

  select(option: SelectOption) {
    if (option.disabled || this.disabled) return;

    if (this.multi) {
      let currentValues = Array.isArray(this.value) ? [...this.value] : [];
      if (currentValues.includes(option.value)) {
        currentValues = currentValues.filter(v => v !== option.value);
      } else {
        currentValues.push(option.value);
      }
      this.value = currentValues;
      this.valueChange.emit(this.value);
    } else {
      this.value = option.value;
      this.valueChange.emit(option.value);
      this.close();
    }
  }

  isSelected(optionValue: any): boolean {
    if (this.multi) {
      return Array.isArray(this.value) && this.value.includes(optionValue);
    }
    return this.value === optionValue;
  }

  onSearchClick(event: MouseEvent) { event.stopPropagation(); }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.isOpen()) return;
    if (this.elementRef.nativeElement.contains(event.target)) return;
    this.close();
  }
}
