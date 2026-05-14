import { Component, ElementRef, AfterViewInit, OnDestroy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-home',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './home.component.html',
})
export class HomeComponent implements AfterViewInit, OnDestroy {
  private observer: IntersectionObserver | null = null;

  constructor(private el: ElementRef) {}

  ngAfterViewInit() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.remove('opacity-0', 'translate-y-12');
          entry.target.classList.add('opacity-100', 'translate-y-0');
          
          this.observer?.unobserve(entry.target);
        }
      });
    }, { 
      threshold: 0.15 // Se activa cuando el 15% del elemento es visible
    });

    const hiddenElements = this.el.nativeElement.querySelectorAll('.reveal-on-scroll');
    hiddenElements.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy() {
    this.observer?.disconnect();
  }
}