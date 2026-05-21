import { Directive, Input, TemplateRef } from '@angular/core';

@Directive({
  selector: 'ng-template[cellKey]',
  standalone: true,
})
export class CellTemplateDirective {
  @Input({ required: true }) cellKey!: string;
  constructor(public templateRef: TemplateRef<any>) {}
}
