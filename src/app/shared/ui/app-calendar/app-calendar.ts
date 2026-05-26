import { Component, forwardRef, input, signal, computed, ElementRef, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

type CalendarView = 'day' | 'month' | 'year';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, LucideAngularModule, FormsModule],
  templateUrl: './app-calendar.html',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => AppCalendar), multi: true }]
})
export class AppCalendar implements ControlValueAccessor {
  label = input<string>('');
  placeholder = input<string>('Seleccionar fecha');
  disabled = input<boolean>(false);
  minDate = input<Date | null>(null);
  maxDate = input<Date | null>(null);
  showTime = input<boolean>(false);

  isOpen = signal(false);
  currentView = signal<CalendarView>('day');
  selectedDate = signal<Date | null>(null);
  selectedHour = signal(0);
  selectedMinute = signal(0);
  currentViewDate = signal<Date>(new Date());

  yearRangeStart = computed(() => { const y = this.currentViewDate().getFullYear(); return y - (y % 12); });
  private onChange: (value: any) => void = () => {};
  private onTouched: () => void = () => {};
  private elementRef = inject(ElementRef);
  weekDays = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  calendarDays = computed(() => {
    const year = this.currentViewDate().getFullYear(), month = this.currentViewDate().getMonth();
    const firstDay = new Date(year, month, 1); let start = firstDay.getDay() - 1; if (start === -1) start = 6;
    const days: Array<{ date: Date; currentMonth: boolean; disabled: boolean }> = [];
    const prevEnd = new Date(year, month, 0).getDate();
    for (let i = start - 1; i >= 0; i--) { const d = new Date(year, month - 1, prevEnd - i); days.push({ date: d, currentMonth: false, disabled: this.isDateDisabled(d) }); }
    for (let i = 1; i <= new Date(year, month + 1, 0).getDate(); i++) { const d = new Date(year, month, i); days.push({ date: d, currentMonth: true, disabled: this.isDateDisabled(d) }); }
    while (days.length < 42) { const d = new Date(year, month + 1, days.length - new Date(year, month + 1, 0).getDate() + 1); days.push({ date: d, currentMonth: false, disabled: this.isDateDisabled(d) }); }
    return days;
  });

  yearsList = computed(() => { const start = this.yearRangeStart(); const years = []; for (let i = 0; i < 12; i++) years.push(start + i); return years; });

  writeValue(obj: any): void {
    if (obj) {
      const date = new Date(obj);
      if (!isNaN(date.getTime())) {
        if (typeof obj === 'string' && obj.includes('-')) {
          const parts = obj.split('T'); const dp = parts[0].split('-');
          date.setFullYear(+dp[0], +dp[1] - 1, +dp[2]);
          if (parts[1]) { const tp = parts[1].split(':'); date.setHours(+tp[0], +(tp[1] || 0)); this.selectedHour.set(date.getHours()); this.selectedMinute.set(date.getMinutes()); }
          else { date.setHours(0, 0, 0, 0); this.selectedHour.set(0); this.selectedMinute.set(0); }
        }
        this.selectedDate.set(date); this.currentViewDate.set(new Date(date));
      }
    } else { this.selectedDate.set(null); this.selectedHour.set(0); this.selectedMinute.set(0); }
  }
  registerOnChange(fn: any): void { this.onChange = fn; }
  registerOnTouched(fn: any): void { this.onTouched = fn; }

  toggle() { if (!this.disabled()) { this.isOpen.update(v => !v); if (this.isOpen()) { this.currentView.set('day'); this.onTouched(); } } }
  zoomOut() { if (this.currentView() === 'day') this.currentView.set('month'); else if (this.currentView() === 'month') this.currentView.set('year'); }
  navigate(delta: number) { const d = new Date(this.currentViewDate()); if (this.currentView() === 'day') d.setMonth(d.getMonth() + delta); else if (this.currentView() === 'month') d.setFullYear(d.getFullYear() + delta); else d.setFullYear(d.getFullYear() + (delta * 12)); this.currentViewDate.set(d); }

  selectDate(date: Date) { if (this.isDateDisabled(date)) return; this.selectedDate.set(date); if (!this.showTime()) { this.onChange(this.fmtIso(date)); this.isOpen.set(false); } }
  confirmDateTime() { const d = this.selectedDate(); if (!d) return; const r = new Date(d.getFullYear(), d.getMonth(), d.getDate(), this.selectedHour(), this.selectedMinute()); this.onChange(this.fmtDtIso(r)); this.isOpen.set(false); }
  selectMonth(m: number) { const d = new Date(this.currentViewDate()); d.setMonth(m); this.currentViewDate.set(d); this.currentView.set('day'); }
  selectYear(y: number) { const d = new Date(this.currentViewDate()); d.setFullYear(y); this.currentViewDate.set(d); this.currentView.set('month'); }

  fmtIso(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
  fmtDtIso(d: Date) { return `${this.fmtIso(d)}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; }

  get displayDate(): string {
    const d = this.selectedDate(); if (!d) return '';
    if (this.showTime()) return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' }) + ' ' + String(this.selectedHour()).padStart(2,'0') + ':' + String(this.selectedMinute()).padStart(2,'0');
    return d.toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric' });
  }

  get headerLabel(): string {
    const d = this.currentViewDate();
    if (this.currentView() === 'day') return `${d.toLocaleString('es-AR',{month:'long'}).replace(/^./,c=>c.toUpperCase())} ${d.getFullYear()}`;
    if (this.currentView() === 'month') return `${d.getFullYear()}`;
    return `${this.yearRangeStart()} - ${this.yearRangeStart()+11}`;
  }

  isSameDate(d1: Date | null, d2: Date): boolean { if (!d1) return false; return d1.getDate()===d2.getDate() && d1.getMonth()===d2.getMonth() && d1.getFullYear()===d2.getFullYear(); }
  isToday(d: Date): boolean { return this.isSameDate(new Date(), d); }
  isCurrMonth(m: number): boolean { return new Date().getMonth()===m && new Date().getFullYear()===this.currentViewDate().getFullYear(); }
  isCurrYear(y: number): boolean { return new Date().getFullYear()===y; }
  isDateDisabled(d: Date): boolean { if (this.minDate() && d < this.minDate()!) return true; if (this.maxDate() && d > this.maxDate()!) return true; return false; }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: MouseEvent) { if (!this.elementRef.nativeElement.contains(event.target)) this.isOpen.set(false); }
}
