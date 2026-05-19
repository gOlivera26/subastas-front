import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowUpDown, Building2, CheckCircle, CheckCircleIcon, ChevronDown, ChevronLeft, ChevronUp, ChevronsUpDown, FileText, Folder, FolderPen, FolderPlus, FolderTree, Handshake, KeyRound, LayoutTemplate, List, Loader, LogOut, LUCIDE_ICONS, LucideIconProvider, MapPin, Moon, MousePointerClick, Pencil, Plus, Search, Settings, Shield, Sun, Tags, Trash2, Unlock, User, UserCircle, UserMinus } from 'lucide-angular';
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
        UserCircle, KeyRound, Pencil, Search, ArrowLeft, AlertTriangle, Handshake, MousePointerClick, Unlock,UserMinus, ChevronLeft,
        Building2, List, Tags, MapPin, Plus, Loader, AlertCircle, FolderTree, Trash2, FolderPen, CheckCircle,
        FolderPlus, Folder,ChevronDown, ChevronUp, ArrowUpDown, ChevronsUpDown, Sun, Moon
      }),
      multi: true,
    },
  ]
};