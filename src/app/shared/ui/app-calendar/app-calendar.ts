import { Component, forwardRef, input, signal, computed, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

type CalendarView = 'day' | 'month' | 'year';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  templateUrl: './app-calendar.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AppCalendar),
      multi: true
    }
  ]
})
export class AppCalendar implements ControlValueAccessor {
  label = input<string>('');
  placeholder = input<string>('Seleccionar fecha');
  disabled = input<boolean>(false);
  minDate = input<Date | null>(null);
  maxDate = input<Date | null>(null);

  isOpen = signal(false);
  currentView = signal<CalendarView>('day');

  selectedDate = signal<Date | null>(null);
  currentViewDate = signal<Date>(new Date());

  yearRangeStart = computed(() => {
    const currentYear = this.currentViewDate().getFullYear();
    return currentYear - (currentYear % 12);
  });

  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private elementRef = inject(ElementRef);

  weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  calendarDays = computed(() => {
    const year = this.currentViewDate().getFullYear();
    const month = this.currentViewDate().getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{ date: Date; currentMonth: boolean; disabled: boolean }> = [];

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({ date: d, currentMonth: false, disabled: this.isDateDisabled(d) });
    }

    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const d = new Date(year, month, i);
      days.push({ date: d, currentMonth: true, disabled: this.isDateDisabled(d) });
    }

    const remainingCells = 42 - days.length;
    for (let i = 1; i <= remainingCells; i++) {
      const d = new Date(year, month + 1, i);
      days.push({ date: d, currentMonth: false, disabled: this.isDateDisabled(d) });
    }
    return days;
  });

  yearsList = computed(() => {
    const start = this.yearRangeStart();
    const years = [];
    for (let i = 0; i < 12; i++) {
      years.push(start + i);
    }
    return years;
  });

  writeValue(obj: any): void {
    if (obj) {
      const date = new Date(obj);
      if (!isNaN(date.getTime())) {
        if (typeof obj === 'string' && obj.includes('-')) {
          const parts = obj.split('-');
          date.setFullYear(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
          date.setHours(0, 0, 0, 0);
        }
        this.selectedDate.set(date);
        this.currentViewDate.set(new Date(date));
      }
    } else {
      this.selectedDate.set(null);
    }
  }

  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }
  setDisabledState?(isDisabled: boolean): void {}

  toggle() {
    if (!this.disabled()) {
      this.isOpen.update(v => !v);
      if (this.isOpen()) {
        this.currentView.set('day');
        this.onTouched();
      }
    }
  }

  zoomOut() {
    if (this.currentView() === 'day') this.currentView.set('month');
    else if (this.currentView() === 'month') this.currentView.set('year');
  }

  navigate(delta: number) {
    const date = new Date(this.currentViewDate());
    if (this.currentView() === 'day') {
      date.setMonth(date.getMonth() + delta);
    } else if (this.currentView() === 'month') {
      date.setFullYear(date.getFullYear() + delta);
    } else if (this.currentView() === 'year') {
      date.setFullYear(date.getFullYear() + (delta * 12));
    }
    this.currentViewDate.set(date);
  }

  selectDate(date: Date) {
    if (this.isDateDisabled(date)) return;
    this.selectedDate.set(date);
    const isoDate = this.formatDateIso(date);
    this.onChange(isoDate);
    this.isOpen.set(false);
  }

  selectMonth(monthIndex: number) {
    const date = new Date(this.currentViewDate());
    date.setMonth(monthIndex);
    this.currentViewDate.set(date);
    this.currentView.set('day');
  }

  selectYear(year: number) {
    const date = new Date(this.currentViewDate());
    date.setFullYear(year);
    this.currentViewDate.set(date);
    this.currentView.set('month');
  }

  isSameDate(d1: Date | null, d2: Date): boolean {
    if (!d1) return false;
    return d1.getDate() === d2.getDate() && d1.getMonth() === d2.getMonth() && d1.getFullYear() === d2.getFullYear();
  }

  isToday(date: Date): boolean {
    return this.isSameDate(new Date(), date);
  }

  isCurrentMonth(monthIndex: number): boolean {
    return new Date().getMonth() === monthIndex && new Date().getFullYear() === this.currentViewDate().getFullYear();
  }

  isCurrentYear(year: number): boolean {
    return new Date().getFullYear() === year;
  }

  isDateDisabled(date: Date): boolean {
    if (this.minDate() && date < this.minDate()!) return true;
    if (this.maxDate() && date > this.maxDate()!) return true;
    return false;
  }

  private formatDateIso(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  get displayDate(): string {
    const d = this.selectedDate();
    if (!d) return '';
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  get headerLabel(): string {
    const date = this.currentViewDate();
    if (this.currentView() === 'day') return `${this.capitalize(date.toLocaleString('es-AR', { month: 'long' }))} ${date.getFullYear()}`;
    if (this.currentView() === 'month') return `${date.getFullYear()}`;
    if (this.currentView() === 'year') {
      const start = this.yearRangeStart();
      return `${start} - ${start + 11}`;
    }
    return '';
  }

  private capitalize(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.isOpen.set(false);
    }
  }
}
