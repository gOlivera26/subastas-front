import { AfterViewChecked, Component, ElementRef, EventEmitter, HostBinding, HostListener, Input, Output, ViewChild, computed, inject, signal } from '@angular/core';
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
export class CustomSelect implements AfterViewChecked {
  @HostBinding('style.position') get hostPosition() {
    return this.isOpen() ? 'relative' : 'static';
  }

  @HostBinding('style.zIndex') get hostZIndex() {
    return this.isOpen() ? '9999' : 'auto';
  }

  @Input() label = '';
  @Input() placeholder = 'Seleccione...';
  @Input() disabled: boolean = false;
  @Input() dropdownMinWidth = 0;

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
  dropdownStyles = signal<Record<string, string>>({});

  private elementRef = inject(ElementRef);
  @ViewChild('triggerButton') private triggerButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('dropdownPanel') private dropdownPanel?: ElementRef<HTMLElement>;

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
      if (this.isOpen()) {
        this.close();
      } else {
        this.searchTerm.set('');
        this.isOpen.set(true);
        requestAnimationFrame(() => this.positionDropdown());
      }
    }
  }

  ngAfterViewChecked() {
    if (!this.isOpen()) return;

    const panel = this.dropdownPanel?.nativeElement;
    if (!panel) return;

    if (panel.parentElement !== document.body) {
      document.body.appendChild(panel);
      this.positionDropdown();
    }
  }

  private positionDropdown() {
    const trigger = this.triggerButton?.nativeElement ?? this.elementRef.nativeElement as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const windowWidth = window.innerWidth;
    const gap = 8;
    const preferredHeight = 320;
    const minHeight = 140;
    const spaceBelow = windowHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openToTop = spaceBelow < preferredHeight && spaceAbove > spaceBelow;
    const availableHeight = Math.max(minHeight, Math.min(preferredHeight, openToTop ? spaceAbove : spaceBelow));
    const desiredWidth = Math.min(Math.max(rect.width, this.dropdownMinWidth || 0), windowWidth - gap * 2);
    const left = Math.min(Math.max(gap, rect.left), Math.max(gap, windowWidth - desiredWidth - gap));

    this.dropdownPosition.set(openToTop ? 'top' : 'bottom');
    this.dropdownStyles.set({
      left: `${left}px`,
      width: `${desiredWidth}px`,
      maxHeight: `${availableHeight}px`,
      ...(openToTop
        ? { bottom: `${windowHeight - rect.top + gap}px` }
        : { top: `${rect.bottom + gap}px` })
    });
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
    const target = event.target as Node;
    if (this.elementRef.nativeElement.contains(target)) return;
    if (this.dropdownPanel?.nativeElement.contains(target)) return;
    this.close();
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange() {
    if (this.isOpen()) this.positionDropdown();
  }
}
