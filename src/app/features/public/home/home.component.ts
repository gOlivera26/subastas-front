import { AfterViewInit, Component, computed, ElementRef, inject, NgZone, OnDestroy, OnInit, signal, ViewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { CotizacionService, SubastaPublicaListDto } from '../../../core/services/cotizacion.service';

type RadarContact = {
  x: number;
  y: number;
  rangeNm: number;
  bearingDeg: number;
  visibleRatio: number;
  inRange: boolean;
};

type RadarPan = { x: number; y: number };

type RadarPanDrag = {
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
};

@Component({
  selector: 'app-home',
  imports: [RouterLink, LucideAngularModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css', './home.component.responsive.css', './home.component.motion.css'],
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly cotizacionService = inject(CotizacionService);
  private readonly ngZone = inject(NgZone);
  @ViewChild('radarCanvas') private radarCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('flightCanvas') private flightCanvas?: ElementRef<HTMLCanvasElement>;
  private observer: IntersectionObserver | null = null;
  private sectionObserver: IntersectionObserver | null = null;
  private previousScrollSnapType = '';
  private previousScrollBehavior = '';
  private wheelLocked = false;
  private wheelUnlockTimer: ReturnType<typeof setTimeout> | null = null;
  private radarAnimationFrame: number | null = null;
  private flightAnimationFrame: number | null = null;
  private flightCanvasResizeHandler: (() => void) | null = null;
  private radarResizeObserver: ResizeObserver | null = null;
  private readonly radarMaxPublicTargets = 48;
  private readonly radarBaseRangeNm = 18;
  readonly radarZoomLevels = [1, 1.35, 1.8, 2.4, 3.2] as const;
  private radarPointer = { x: 0.52, y: 0.48, active: false };
  private radarPanDrag: RadarPanDrag | null = null;
  private flightPass: { active: boolean; start: number; y: number; duration: number } = { active: false, start: 0, y: 0, duration: 1280 };
  private lastSweptRadarTarget: number | null = null;

  readonly subastasPublicas = signal<SubastaPublicaListDto[]>([]);
  readonly cargandoSubastas = signal(true);
  readonly radarError = signal('');
  readonly activeRadarTarget = signal<number | null>(null);
  readonly sweptRadarTarget = signal<number | null>(null);
  readonly radarZoom = signal(1);
  readonly radarPan = signal<RadarPan>({ x: 0, y: 0 });
  readonly isRadarPanning = signal(false);
  readonly radarSubastas = computed(() => this.subastasPublicas().slice(0, this.radarMaxPublicTargets));
  readonly radarRangeNm = computed(() => Math.max(4, Math.round(this.radarBaseRangeNm / this.radarZoom())));
  readonly radarContactsInRange = computed(() => {
    const total = this.radarSubastas().length;
    return this.radarSubastas().filter((_, index) => this.radarTargetInRange(index, total)).length;
  });

  constructor(private readonly elementRef: ElementRef<HTMLElement>) {}

  radarTargetX(index: number, total = this.radarSubastas().length): number {
    return this.getRadarContact(index, total).x;
  }

  radarTargetY(index: number, total = this.radarSubastas().length): number {
    return this.getRadarContact(index, total).y;
  }

  radarTargetInRange(index: number, total = this.radarSubastas().length): boolean {
    return this.getRadarContact(index, total).inRange;
  }

  radarTargetCoordinate(index: number, total = this.radarSubastas().length): string {
    const contact = this.getRadarContact(index, total);
    return `${String(contact.bearingDeg).padStart(3, '0')}° · ${contact.rangeNm.toFixed(1)} NM`;
  }

  radarTargetAriaLabel(subasta: SubastaPublicaListDto, index: number, total = this.radarSubastas().length): string {
    const state = this.radarTargetInRange(index, total) ? 'en rango visible' : 'fuera del rango visible';
    return `Abrir subasta activa ${subasta.titulo}. Coordenadas ${this.radarTargetCoordinate(index, total)}, ${state}.`;
  }

  radarZoomLabel(): string {
    const zoom = this.radarZoom();
    return `${Number.isInteger(zoom) ? zoom.toFixed(0) : zoom.toFixed(2).replace(/0$/, '')}x`;
  }

  canDecreaseRadarZoom(): boolean {
    return this.radarZoomLevels.indexOf(this.radarZoom() as typeof this.radarZoomLevels[number]) > 0;
  }

  canIncreaseRadarZoom(): boolean {
    return this.radarZoomLevels.indexOf(this.radarZoom() as typeof this.radarZoomLevels[number]) < this.radarZoomLevels.length - 1;
  }

  decreaseRadarZoom(): void {
    const current = this.radarZoomLevels.indexOf(this.radarZoom() as typeof this.radarZoomLevels[number]);
    this.setRadarZoom(this.radarZoomLevels[Math.max(0, current - 1)]);
  }

  increaseRadarZoom(): void {
    const current = this.radarZoomLevels.indexOf(this.radarZoom() as typeof this.radarZoomLevels[number]);
    this.setRadarZoom(this.radarZoomLevels[Math.min(this.radarZoomLevels.length - 1, current + 1)]);
  }

  setRadarZoom(zoom: number): void {
    const closest = this.radarZoomLevels.reduce((best, level) => Math.abs(level - zoom) < Math.abs(best - zoom) ? level : best, this.radarZoomLevels[0]);
    this.radarZoom.set(closest);
    this.radarPan.set(this.clampRadarPan(this.radarPan()));
  }

  resetRadarPan(): void {
    this.radarPan.set({ x: 0, y: 0 });
  }

  hasRadarPan(): boolean {
    const pan = this.radarPan();
    return Math.abs(pan.x) > 0.01 || Math.abs(pan.y) > 0.01;
  }

  radarPanLabel(): string {
    const pan = this.radarPan();
    const east = pan.x * this.radarRangeNm();
    const north = -pan.y * this.radarRangeNm();
    if (!this.hasRadarPan()) {
      return 'Centro 0.0 · 0.0 NM';
    }

    return 'Centro ' + (east >= 0 ? 'E' : 'W') + ' ' + Math.abs(east).toFixed(1) + ' · ' + (north >= 0 ? 'N' : 'S') + ' ' + Math.abs(north).toFixed(1) + ' NM';
  }

  private radarPanLimit(): number {
    const zoom = this.radarZoom();
    if (zoom <= 1) {
      return 0;
    }

    const visibleRange = Math.max(this.radarRangeNm(), 0.1);
    const farthestTargetRatio = this.maxRadarWorldRatio(visibleRange);
    const ergonomicBaseLimit = (1 - 1 / zoom) * 0.92;
    const targetReachLimit = Math.max(0, farthestTargetRatio - 0.34);

    return Math.max(ergonomicBaseLimit, Math.min(2.95, targetReachLimit));
  }

  private maxRadarWorldRatio(visibleRange: number): number {
    const total = this.radarSubastas().length;
    if (total === 0) {
      return 1;
    }

    let maxRatio = 1;
    for (let index = 0; index < total; index += 1) {
      maxRatio = Math.max(maxRatio, this.getRadarPolar(index, total).rangeNm / visibleRange);
    }

    return maxRatio;
  }

  private clampRadarPan(pan: RadarPan): RadarPan {
    const limit = this.radarPanLimit();
    return {
      x: Math.min(limit, Math.max(-limit, pan.x)),
      y: Math.min(limit, Math.max(-limit, pan.y)),
    };
  }

  setRadarHover(index: number | null): void {
    this.activeRadarTarget.set(index);
  }

  updateRadarPointer(event: MouseEvent | PointerEvent): void {
    this.updateRadarPointerFromEvent(event, event.currentTarget as HTMLElement);
  }

  clearRadarPointer(): void {
    if (!this.isRadarPanning()) {
      this.radarPointer = { ...this.radarPointer, active: false };
    }
  }

  onRadarWheel(event: WheelEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (Math.abs(event.deltaY) < 1) {
      return;
    }

    event.deltaY < 0 ? this.increaseRadarZoom() : this.decreaseRadarZoom();
  }

  startRadarPan(event: PointerEvent): void {
    const target = event.target as HTMLElement | null;
    if (target?.closest('a.radar-target, button')) {
      return;
    }
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const pan = this.radarPan();
    this.radarPanDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: pan.x,
      originY: pan.y,
    };
    this.isRadarPanning.set(true);
    this.updateRadarPointer(event);
    (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  moveRadarPan(event: PointerEvent): void {
    this.updateRadarPointer(event);
    if (!this.radarPanDrag || this.radarPanDrag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.405);
    const dx = (event.clientX - this.radarPanDrag.startX) / radius;
    const dy = (event.clientY - this.radarPanDrag.startY) / radius;
    this.radarPan.set(this.clampRadarPan({
      x: this.radarPanDrag.originX - dx,
      y: this.radarPanDrag.originY - dy,
    }));
  }

  endRadarPan(event: PointerEvent): void {
    if (!this.radarPanDrag || this.radarPanDrag.pointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).releasePointerCapture?.(event.pointerId);
    this.radarPanDrag = null;
    this.isRadarPanning.set(false);
  }

  handleRadarKeydown(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    const panStep = this.radarZoom() >= 2.4 ? 0.14 : 0.09;
    const currentPan = this.radarPan();
    const actions: Record<string, () => void> = {
      '+': () => this.increaseRadarZoom(),
      '=': () => this.increaseRadarZoom(),
      '-': () => this.decreaseRadarZoom(),
      '_': () => this.decreaseRadarZoom(),
      Home: () => this.resetRadarPan(),
      ArrowLeft: () => this.radarPan.set(this.clampRadarPan({ ...currentPan, x: currentPan.x - panStep })),
      ArrowRight: () => this.radarPan.set(this.clampRadarPan({ ...currentPan, x: currentPan.x + panStep })),
      ArrowUp: () => this.radarPan.set(this.clampRadarPan({ ...currentPan, y: currentPan.y - panStep })),
      ArrowDown: () => this.radarPan.set(this.clampRadarPan({ ...currentPan, y: currentPan.y + panStep })),
    };

    const action = actions[event.key];
    if (!action) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    action();
  }

  private updateRadarPointerFromEvent(event: MouseEvent | PointerEvent, element: HTMLElement): void {
    const rect = element.getBoundingClientRect();
    this.radarPointer = {
      x: Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height)),
      active: true,
    };
  }
  private readonly handleSectionWheel = (event: WheelEvent): void => {
    if (window.matchMedia('(max-width: 760px)').matches) {
      return;
    }

    if (this.wheelLocked || Math.abs(event.deltaY) < 8) {
      event.preventDefault();
      return;
    }

    const sections = Array.from(
      this.elementRef.nativeElement.querySelectorAll<HTMLElement>('.home-snap-section'),
    );
    if (sections.length === 0) {
      return;
    }

    event.preventDefault();

    const referenceTop = window.scrollY + 80;
    const currentIndex = sections.reduce((closestIndex, section, index) => {
      const currentDistance = Math.abs(sections[closestIndex].offsetTop - referenceTop);
      const candidateDistance = Math.abs(section.offsetTop - referenceTop);
      return candidateDistance < currentDistance ? index : closestIndex;
    }, 0);
    const direction = event.deltaY > 0 ? 1 : -1;
    const targetIndex = Math.min(Math.max(currentIndex + direction, 0), sections.length - 1);

    if (targetIndex === currentIndex) {
      return;
    }

    this.wheelLocked = true;
    sections[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });
    this.wheelUnlockTimer = setTimeout(() => {
      this.wheelLocked = false;
      this.wheelUnlockTimer = null;
    }, 850);
  };

  ngOnInit(): void {
    this.cotizacionService.getPublicasActivas().subscribe({
      next: response => {
        this.cargandoSubastas.set(false);
        this.radarError.set(response.success ? '' : response.message || 'No se pudieron cargar las subastas públicas.');
        this.subastasPublicas.set(response.success && response.data ? response.data : []);
      },
      error: () => {
        this.cargandoSubastas.set(false);
        this.radarError.set('Sin conexión con el servidor.');
        this.subastasPublicas.set([]);
      },
    });
  }

  ngAfterViewInit(): void {
    const elements = this.elementRef.nativeElement.querySelectorAll<HTMLElement>('.reveal-on-scroll');
    const sections = this.elementRef.nativeElement.querySelectorAll<HTMLElement>('.flight-section');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.previousScrollSnapType = document.documentElement.style.scrollSnapType;
    this.previousScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollSnapType = reducedMotion
      ? ''
      : window.matchMedia('(max-width: 760px)').matches
        ? 'y proximity'
        : 'y mandatory';
    document.documentElement.style.scrollBehavior = reducedMotion ? 'auto' : 'smooth';

    if (!reducedMotion && window.matchMedia('(min-width: 761px)').matches) {
      window.addEventListener('wheel', this.handleSectionWheel, { passive: false });
    }

    this.initRadarCanvas(reducedMotion);
    this.initFlightCanvas(reducedMotion);

    if (reducedMotion || !('IntersectionObserver' in window)) {
      elements.forEach(element => element.classList.add('is-visible'));
      sections.forEach(section => section.classList.add('section-active'));
      return;
    }

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('is-visible');
          this.observer?.unobserve(entry.target);
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -48px',
      },
    );

    elements.forEach(element => this.observer?.observe(element));

    this.sectionObserver = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) {
            return;
          }

          entry.target.classList.add('section-active');
          this.triggerFlightPass(entry.target as HTMLElement);
          this.sectionObserver?.unobserve(entry.target);
        });
      },
      {
        threshold: 0.18,
        rootMargin: '0px 0px -12%',
      },
    );

    sections.forEach(section => this.sectionObserver?.observe(section));
  }


  private initRadarCanvas(reducedMotion: boolean): void {
    const canvas = this.radarCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) {
      return;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.drawRadarFrame(context, width, height, performance.now());
    };

    this.radarResizeObserver = new ResizeObserver(resize);
    this.radarResizeObserver.observe(canvas);

    this.ngZone.runOutsideAngular(() => {
      const render = (time: number) => {
        const rect = canvas.getBoundingClientRect();
        this.drawRadarFrame(context, rect.width, rect.height, time);
        if (!reducedMotion) {
          this.radarAnimationFrame = requestAnimationFrame(render);
        }
      };

      resize();
      if (!reducedMotion) {
        this.radarAnimationFrame = requestAnimationFrame(render);
      }
    });
  }

  private initFlightCanvas(reducedMotion: boolean): void {
    const canvas = this.flightCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || reducedMotion) {
      return;
    }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    this.flightCanvasResizeHandler = resize;
    window.addEventListener('resize', resize, { passive: true });
  }

  private triggerFlightPass(section: HTMLElement): void {
    const canvas = this.flightCanvas?.nativeElement;
    const context = canvas?.getContext('2d');
    if (!canvas || !context || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const rect = section.getBoundingClientRect();
    const y = Math.min(window.innerHeight - 96, Math.max(116, rect.top + rect.height * 0.32));
    this.flightPass = { active: true, start: performance.now(), y, duration: 1280 };

    if (this.flightAnimationFrame !== null) {
      cancelAnimationFrame(this.flightAnimationFrame);
    }

    this.ngZone.runOutsideAngular(() => {
      const render = (time: number) => {
        this.drawFlightFrame(context, canvas.getBoundingClientRect().width, canvas.getBoundingClientRect().height, time);
        if (this.flightPass.active) {
          this.flightAnimationFrame = requestAnimationFrame(render);
        }
      };
      this.flightAnimationFrame = requestAnimationFrame(render);
    });
  }

  private drawFlightFrame(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    ctx.clearRect(0, 0, width, height);
    if (!this.flightPass.active) {
      return;
    }

    const progress = Math.min(1, Math.max(0, (time - this.flightPass.start) / this.flightPass.duration));
    const eased = this.easeInOutCubic(progress);
    const x = -92 + (width + 184) * eased;
    const y = this.flightPass.y + Math.sin(progress * Math.PI) * -32 + Math.sin(progress * Math.PI * 2) * 8;
    const cyan = this.cssColor('--color-cyan-spark', '#02b8cc');
    const lime = this.cssColor('--color-neon-lime', '#e4f222');
    const blue = this.cssColor('--color-aether-blue', '#4aa3ff');
    const trailLength = Math.min(520, width * 0.38);
    const startX = Math.max(-40, x - trailLength);

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const trail = ctx.createLinearGradient(startX, y, x, y);
    trail.addColorStop(0, 'rgba(0,0,0,0)');
    trail.addColorStop(0.28, this.toRgba(blue, 0.08));
    trail.addColorStop(0.72, this.toRgba(cyan, 0.32));
    trail.addColorStop(1, this.toRgba(lime, 0.76));
    ctx.strokeStyle = trail;
    ctx.lineWidth = 3.4;
    ctx.lineCap = 'round';
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 18;
    ctx.beginPath();
    ctx.moveTo(startX, y + 18 * Math.sin(progress * Math.PI));
    ctx.bezierCurveTo(x - trailLength * 0.72, y - 22, x - trailLength * 0.35, y + 20, x - 12, y);
    ctx.stroke();

    for (let i = 0; i < 22; i += 1) {
      const t = i / 22;
      const px = x - trailLength * t + Math.sin(i * 12.989 + progress * 7) * 10;
      const py = y + Math.sin(t * Math.PI * 2 + progress * 5) * 18;
      const alpha = (1 - t) * 0.34 * Math.sin(progress * Math.PI);
      ctx.fillStyle = this.toRgba(i % 3 === 0 ? lime : cyan, alpha);
      ctx.beginPath();
      ctx.arc(px, py, 1 + (1 - t) * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    const halo = ctx.createRadialGradient(x, y, 0, x, y, 54);
    halo.addColorStop(0, this.toRgba(lime, 0.30));
    halo.addColorStop(0.45, this.toRgba(cyan, 0.16));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, 54, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(x, y);
    ctx.rotate(-0.06);
    ctx.scale(1.05, 1.05);
    ctx.fillStyle = lime;
    ctx.shadowColor = lime;
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.moveTo(24, 0); ctx.lineTo(10, -4); ctx.lineTo(2, -4); ctx.lineTo(-9, -18); ctx.lineTo(-15, -17); ctx.lineTo(-8, -4.5); ctx.lineTo(-21, -4.5); ctx.lineTo(-29, -10); ctx.lineTo(-33, -9); ctx.lineTo(-27, 0); ctx.lineTo(-33, 9); ctx.lineTo(-29, 10); ctx.lineTo(-21, 4.5); ctx.lineTo(-8, 4.5); ctx.lineTo(-15, 17); ctx.lineTo(-9, 18); ctx.lineTo(2, 4); ctx.lineTo(10, 4); ctx.closePath();
    ctx.fill();
    ctx.restore();

    if (progress >= 1) {
      this.flightPass.active = false;
      ctx.clearRect(0, 0, width, height);
      if (this.flightAnimationFrame !== null) {
        cancelAnimationFrame(this.flightAnimationFrame);
        this.flightAnimationFrame = null;
      }
    }
  }

  private easeInOutCubic(value: number): number {
    return value < 0.5 ? 4 * value ** 3 : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }
  private drawRadarFrame(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }

    const cyan = this.cssColor('--color-cyan-spark', '#02b8cc');
    const lime = this.cssColor('--color-neon-lime', '#e4f222');
    const blue = this.cssColor('--color-aether-blue', '#4aa3ff');
    const porcelain = this.cssColor('--color-porcelain', '#f7f7f2');
    const graphite = this.cssColor('--color-graphite', '#151b26');
    const activeIndex = this.activeRadarTarget();
    const targetCount = this.radarSubastas().length;
    const visibleRangeNm = this.radarRangeNm();

    ctx.clearRect(0, 0, width, height);
    ctx.save();

    const cx = width * 0.5;
    const cy = height * 0.52;
    const radius = Math.min(width, height) * 0.405;
    const sweepAngle = this.radarSweepAngle(time);
    const sweptIndex = this.getSweptRadarTarget(width, height, cx, cy, radius, sweepAngle, targetCount);
    this.updateSweptRadarTarget(sweptIndex);

    this.drawRadarScope(ctx, width, height, cx, cy, radius, visibleRangeNm, cyan, lime, blue, porcelain, graphite);
    this.drawRadarSweep(ctx, cx, cy, radius, sweepAngle, cyan, lime);
    this.drawRadarNoise(ctx, width, height, time, cyan, blue);
    this.drawRadarPointer(ctx, width, height, cyan, lime, porcelain);
    this.drawOwnship(ctx, cx, cy, radius, cyan, lime, porcelain);
    this.drawRadarTargets(ctx, width, height, time, targetCount, activeIndex, sweptIndex, cyan, lime, porcelain);

    ctx.restore();
  }

  private drawRadarScope(ctx: CanvasRenderingContext2D, width: number, height: number, cx: number, cy: number, radius: number, visibleRangeNm: number, cyan: string, lime: string, blue: string, porcelain: string, graphite: string): void {
    ctx.save();

    const vignette = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius * 1.55);
    vignette.addColorStop(0, this.toRgba(cyan, 0.13));
    vignette.addColorStop(0.54, this.toRgba(graphite, 0.16));
    vignette.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);

    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    ctx.lineWidth = 1;
    ctx.strokeStyle = this.toRgba(cyan, 0.055);
    const gridStep = Math.max(28, Math.floor(radius / 4));
    for (let x = cx - radius; x <= cx + radius; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, cy - radius);
      ctx.lineTo(x, cy + radius);
      ctx.stroke();
    }
    for (let y = cy - radius; y <= cy + radius; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(cx - radius, y);
      ctx.lineTo(cx + radius, y);
      ctx.stroke();
    }

    [0.25, 0.5, 0.75, 1].forEach((multiplier, index) => {
      ctx.strokeStyle = this.toRgba(cyan, index === 3 ? 0.30 : 0.16);
      ctx.lineWidth = index === 3 ? 1.25 : 1;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * multiplier, 0, Math.PI * 2);
      ctx.stroke();
    });

    for (let degrees = 0; degrees < 360; degrees += 10) {
      const angle = (degrees - 90) * Math.PI / 180;
      const isMajor = degrees % 30 === 0;
      const inner = radius - (isMajor ? 12 : 6);
      const outer = radius;
      ctx.strokeStyle = this.toRgba(isMajor ? lime : cyan, isMajor ? 0.32 : 0.18);
      ctx.lineWidth = isMajor ? 1.2 : 0.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner);
      ctx.lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer);
      ctx.stroke();
    }

    ctx.strokeStyle = this.toRgba(cyan, 0.18);
    ctx.setLineDash([5, 10]);
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = this.toRgba(porcelain, 0.64);
    ctx.font = '700 9px JetBrains Mono, ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', cx, cy - radius - 8);
    ctx.fillText('S', cx, cy + radius + 15);
    ctx.fillText('E', cx + radius + 12, cy + 3);
    ctx.fillText('W', cx - radius - 12, cy + 3);
    ctx.textAlign = 'left';
    ctx.fillStyle = this.toRgba(cyan, 0.70);
        const scopeLabelX = Math.max(16, cx - radius);
        const scopeLabelY = Math.max(18, cy - radius - 22);
        ctx.fillText(`PPI · RNG ${visibleRangeNm} NM`, scopeLabelX, scopeLabelY);
        if (this.hasRadarPan()) {
          ctx.fillStyle = this.toRgba(lime, 0.68);
          ctx.fillText(this.radarPanLabel().replace('Centro ', 'CTR '), scopeLabelX + 112, scopeLabelY);
        }
        ctx.fillStyle = this.toRgba(lime, 0.72);
    ctx.fillText('TFC', Math.max(16, cx - radius), Math.min(height - 12, cy + radius + 28));
    ctx.restore();
  }

  private drawOwnship(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, cyan: string, lime: string, porcelain: string): void {
    ctx.save();
    const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 0.18);
    halo.addColorStop(0, this.toRgba(lime, 0.18));
    halo.addColorStop(0.45, this.toRgba(cyan, 0.08));
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.toRgba(cyan, 0.45);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 15, 0, Math.PI * 2);
    ctx.stroke();

    ctx.translate(cx, cy);
    ctx.strokeStyle = this.toRgba(lime, 0.84);
    ctx.fillStyle = this.toRgba(lime, 0.18);
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(9, 10);
    ctx.lineTo(0, 5);
    ctx.lineTo(-9, 10);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = this.toRgba(porcelain, 0.75);
    ctx.fillRect(-1, -18, 2, 7);
    ctx.restore();
  }

  private drawRadarGrid(ctx: CanvasRenderingContext2D, width: number, height: number, cyan: string): void {
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.toRgba(cyan, 0.055);
    const step = 38;
    for (let x = 0; x <= width; x += step) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += step) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  private radarSweepAngle(time: number): number {
    return time * 0.00105;
  }

  private normalizeAngle(angle: number): number {
    return ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  }

  private angleDistance(a: number, b: number): number {
    const distance = Math.abs(this.normalizeAngle(a) - this.normalizeAngle(b));
    return Math.min(distance, Math.PI * 2 - distance);
  }

  private getSweptRadarTarget(width: number, height: number, cx: number, cy: number, radius: number, sweepAngle: number, count: number): number | null {
    const normalizedSweep = this.normalizeAngle(sweepAngle);

    for (let index = 0; index < count; index += 1) {
      const contact = this.getRadarCanvasContact(index, count, width, height, cx, cy, radius);
      if (!contact.inRange) {
        continue;
      }
      const targetAngle = this.normalizeAngle(Math.atan2(contact.y - cy, contact.x - cx));
      if (this.angleDistance(normalizedSweep, targetAngle) < 0.18) {
        return index;
      }
    }
    return null;
  }

  private updateSweptRadarTarget(index: number | null): void {
    if (this.lastSweptRadarTarget === index) {
      return;
    }

    this.lastSweptRadarTarget = index;
    this.ngZone.run(() => this.sweptRadarTarget.set(index));
  }

  private drawRadarRings(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, cyan: string): void {
    ctx.save();
    ctx.strokeStyle = this.toRgba(cyan, 0.18);
    ctx.lineWidth = 1;
    [0.28, 0.56, 0.86].forEach(multiplier => {
      ctx.beginPath();
      ctx.arc(cx, cy, radius * multiplier, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = this.toRgba(cyan, 0.10);
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy);
    ctx.lineTo(cx + radius, cy);
    ctx.moveTo(cx, cy - radius);
    ctx.lineTo(cx, cy + radius);
    ctx.stroke();
    ctx.restore();
  }

  private drawRadarSweep(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, angle: number, cyan: string, lime: string): void {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);

    const sweep = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
    sweep.addColorStop(0, this.toRgba(cyan, 0.24));
    sweep.addColorStop(0.58, this.toRgba(cyan, 0.075));
    sweep.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, -0.035, 0.31);
    ctx.closePath();
    ctx.fillStyle = sweep;
    ctx.fill();

    const line = ctx.createLinearGradient(0, 0, radius, 0);
    line.addColorStop(0, this.toRgba(cyan, 0));
    line.addColorStop(0.52, this.toRgba(cyan, 0.42));
    line.addColorStop(1, this.toRgba(lime, 0.86));
    ctx.strokeStyle = line;
    ctx.lineWidth = 2.15;
    ctx.shadowColor = cyan;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(radius * 0.99, 0);
    ctx.stroke();
    ctx.restore();
  }

  private drawRadarNoise(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, cyan: string, blue: string): void {
    ctx.save();
    for (let i = 0; i < 18; i += 1) {
      const seed = i * 97.13;
      const x = (Math.sin(seed) * 0.5 + 0.5) * width;
      const y = (Math.cos(seed * 1.7) * 0.5 + 0.5) * height;
      const pulse = (Math.sin(time * 0.0022 + i) + 1) / 2;
      ctx.fillStyle = this.toRgba(i % 3 === 0 ? blue : cyan, 0.03 + pulse * 0.09);
      ctx.beginPath();
      ctx.arc(x, y, 1.2 + pulse * 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }


  private drawRadarPointer(ctx: CanvasRenderingContext2D, width: number, height: number, cyan: string, lime: string, porcelain: string): void {
    if (!this.radarPointer.active) {
      return;
    }

    const x = this.radarPointer.x * width;
    const y = this.radarPointer.y * height;
    const cx = width * 0.5;
    const cy = height * 0.52;
    const radius = Math.min(width, height) * 0.405;
    const screenDx = (x - cx) / Math.max(radius, 1);
        const screenDy = (y - cy) / Math.max(radius, 1);
        const pan = this.radarPan();
        const worldX = screenDx + pan.x;
        const worldY = screenDy + pan.y;
        const distanceRatio = Math.min(1.4, Math.hypot(worldX, worldY));
        const bearing = Math.round((Math.atan2(worldY, worldX) * 180 / Math.PI + 450) % 360);
        const range = Math.max(0, distanceRatio * this.radarRangeNm());
        const inScope = Math.hypot(screenDx, screenDy) <= 1;
    const label = inScope
      ? String(bearing).padStart(3, '0') + '° · ' + range.toFixed(1) + ' NM'
      : String(bearing).padStart(3, '0') + '° · fuera de escala';

    ctx.save();
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 58);
    glow.addColorStop(0, this.toRgba(cyan, 0.16));
    glow.addColorStop(0.46, this.toRgba(cyan, 0.055));
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, 58, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = this.toRgba(lime, inScope ? 0.36 : 0.22);
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 7]);
    ctx.beginPath();
    ctx.moveTo(x - 34, y);
    ctx.lineTo(x + 34, y);
    ctx.moveTo(x, y - 34);
    ctx.lineTo(x, y + 34);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = this.toRgba(cyan, inScope ? 0.50 : 0.30);
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.stroke();

    const labelX = Math.min(width - 150, Math.max(12, x + 18));
    const labelY = Math.min(height - 18, Math.max(28, y - 18));
    ctx.font = '800 10px JetBrains Mono, ui-monospace, monospace';
    const textWidth = Math.min(152, Math.max(92, ctx.measureText(label).width + 18));
    ctx.fillStyle = 'rgba(4, 8, 14, 0.74)';
    ctx.strokeStyle = this.toRgba(cyan, 0.24);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY - 16, textWidth, 24, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = inScope ? this.toRgba(porcelain, 0.88) : this.toRgba(porcelain, 0.52);
    ctx.fillText(label, labelX + 9, labelY);
    ctx.restore();
  }
  private drawRadarTargets(ctx: CanvasRenderingContext2D, width: number, height: number, time: number, count: number, activeIndex: number | null, sweptIndex: number | null, cyan: string, lime: string, porcelain: string): void {
    const cx = width * 0.5;
    const cy = height * 0.52;
    const radius = Math.min(width, height) * 0.405;
    ctx.save();
    for (let index = 0; index < count; index += 1) {
      const contact = this.getRadarCanvasContact(index, count, width, height, cx, cy, radius);
      if (!contact.inRange) {
        continue;
      }
      const x = contact.x;
      const y = contact.y;
      const active = activeIndex === index;
      const swept = sweptIndex === index;
      const pulse = (Math.sin(time * 0.003 + index * 1.7) + 1) / 2;
      const scanPulse = swept ? (Math.sin(time * 0.045) + 1) / 2 : 0;
      const color = active || swept ? lime : cyan;
      const alpha = contact.inRange ? 1 : 0.34;
      if (swept) {
        const glow = ctx.createRadialGradient(x, y, 0, x, y, 38 + scanPulse * 16);
        glow.addColorStop(0, this.toRgba(lime, 0.36));
        glow.addColorStop(0.32, this.toRgba(cyan, 0.14));
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, 38 + scanPulse * 16, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = this.toRgba(lime, 0.56 + scanPulse * 0.22); ctx.lineWidth = 1.1; ctx.setLineDash([3, 6]); ctx.beginPath(); ctx.arc(x, y, 20 + scanPulse * 8, -0.4, Math.PI * 1.35); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.shadowColor = color;
      ctx.shadowBlur = swept ? 18 + scanPulse * 12 : active ? 14 : 0;
      ctx.strokeStyle = this.toRgba(color, (active ? 0.82 : swept ? 0.72 + scanPulse * 0.18 : 0.42 + pulse * 0.2) * alpha);
      ctx.lineWidth = active ? 2.5 : swept ? 2.25 : 1.7;
      ctx.beginPath(); ctx.arc(x, y, active ? 14 : swept ? 14 + scanPulse * 5 : 8.5 + pulse * 2.5, 0, Math.PI * 2); ctx.stroke(); ctx.shadowBlur = 0;
      ctx.fillStyle = this.toRgba(color, (active ? 0.42 : swept ? 0.58 : 0.24) * alpha); ctx.beginPath(); ctx.arc(x, y, active || swept ? 4.6 : 3.2, 0, Math.PI * 2); ctx.fill();
      if (active || swept) { ctx.fillStyle = this.toRgba(porcelain, 0.84); ctx.font = '700 10px JetBrains Mono, ui-monospace, monospace'; ctx.fillText(String(contact.bearingDeg).padStart(3, '0') + '°', x + 16, y - 12); }
    }
    ctx.restore();
  }

  private getRadarContact(index: number, total: number): RadarContact {
    const { bearingDeg, bearingRad, rangeNm } = this.getRadarPolar(index, total);
    const visibleRange = this.radarRangeNm();
    const pan = this.radarPan();
    const worldRatio = rangeNm / Math.max(visibleRange, 0.1);
    const mapX = Math.cos(bearingRad) * worldRatio - pan.x;
    const mapY = Math.sin(bearingRad) * worldRatio - pan.y;
    const screenRatio = Math.hypot(mapX, mapY);
    const x = 50 + mapX * 31;
    const y = 52 + mapY * 40;
    const insideFrame = x >= 4 && x <= 96 && y >= 5 && y <= 95;
    const inRange = screenRatio <= 0.96 && insideFrame;
    return { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), rangeNm, bearingDeg, visibleRatio: screenRatio, inRange };
  }

  private getRadarPolar(index: number, total: number): { bearingDeg: number; bearingRad: number; rangeNm: number } {
    const safeTotal = Math.max(1, total);
    const goldenAngle = 137.508;
    const bearingDeg = Math.round((index * goldenAngle + 18) % 360);
    const bearingRad = (bearingDeg - 90) * Math.PI / 180;
    const ringStep = ((index * 7) % 13) / 12;
    const crowdOffset = Math.min(0.1, safeTotal * 0.0025);
    const rangeRatio = Math.min(0.94, 0.22 + ringStep * 0.64 + crowdOffset);
    const rangeNm = Number((rangeRatio * this.radarBaseRangeNm).toFixed(1));

    return { bearingDeg, bearingRad, rangeNm };
  }

  private getRadarCanvasContact(index: number, total: number, width: number, height: number, cx: number, cy: number, radius: number): RadarContact {
    const contact = this.getRadarContact(index, total);
    return { ...contact, x: width * contact.x / 100, y: height * contact.y / 100 };
  }

  private cssColor(name: string, fallback: string): string {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  private toRgba(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const value = color.replace('#', '');
      const normalized = value.length === 3 ? value.split('').map(char => char + char).join('') : value;
      const int = Number.parseInt(normalized, 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number);
    if (channels?.length === 3) {
      return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
    }

    return color;
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.sectionObserver?.disconnect();
    this.radarResizeObserver?.disconnect();
    if (this.radarAnimationFrame !== null) {
      cancelAnimationFrame(this.radarAnimationFrame);
      this.radarAnimationFrame = null;
    }
    window.removeEventListener('wheel', this.handleSectionWheel);
    if (this.flightCanvasResizeHandler) {
      window.removeEventListener('resize', this.flightCanvasResizeHandler);
      this.flightCanvasResizeHandler = null;
    }
    if (this.wheelUnlockTimer) {
      clearTimeout(this.wheelUnlockTimer);
    }
    document.documentElement.style.scrollSnapType = this.previousScrollSnapType;
    document.documentElement.style.scrollBehavior = this.previousScrollBehavior;
  }
}
