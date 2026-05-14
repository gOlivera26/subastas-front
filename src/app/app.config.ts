import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AlertTriangle, ArrowLeft, ChevronLeft, FileText, Handshake, KeyRound, LayoutTemplate, LogOut, LUCIDE_ICONS, LucideIconProvider, MousePointerClick, Pencil, Search, Settings, Shield, Unlock, User, UserCircle, UserMinus } from 'lucide-angular';
import { 
  Gavel, UserPlus, Zap, Trophy, Eye, Github, Twitter, Linkedin, 
  ArrowRight, Sparkles, Menu, X, ChevronRight, ShieldCheck, EyeOff, Activity,
  Mail, Lock, LogIn, Loader2, Users, ShoppingBag
} from 'lucide-angular/src/icons';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; // <-- NUEVO
import { authInterceptor } from './core/interceptos/auth.interceptors';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])), 
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ 
        Gavel, UserPlus, Zap, Trophy, Eye, Github, Twitter, Linkedin, 
        ArrowRight, Sparkles, Menu, X, ChevronRight, ShieldCheck, EyeOff, Activity,
        Mail, Lock, LogIn, Loader2, Users, ShoppingBag, User, LogOut, Settings, Shield, LayoutTemplate, FileText,
        UserCircle, KeyRound, Pencil, Search, ArrowLeft, AlertTriangle, Handshake, MousePointerClick, Unlock,UserMinus, ChevronLeft
      }),
      multi: true,
    },
  ]
};