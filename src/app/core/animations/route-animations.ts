import { trigger, transition, style, animate, query, group } from '@angular/animations';

export const routeFade = trigger('routeFade', [
  transition('* <=> *', [
    style({ position: 'relative' }),
    query(':enter, :leave', [
      style({ position: 'absolute', left: 0, width: '100%', opacity: 0, transform: 'translateY(8px)' })
    ], { optional: true }),
    query(':leave', [
      animate('120ms ease-out', style({ opacity: 0, transform: 'translateY(-6px)' }))
    ], { optional: true }),
    query(':enter', [
      animate('250ms 80ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
    ], { optional: true }),
  ]),
]);
