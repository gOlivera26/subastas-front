import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AlertTriangle, ArrowLeft, Check, ChevronLeft, FileText, Handshake, KeyRound, LayoutTemplate, LogOut, LUCIDE_ICONS, LucideIconProvider, MousePointerClick, Pencil, Search, Settings, Shield, Unlock, User, UserCircle, UserMinus } from 'lucide-angular';
import { 
  Gavel, UserPlus, Zap, Trophy, Eye, Github, Twitter, Linkedin, 
  ArrowRight, Sparkles, Menu, X, ChevronRight, ShieldCheck, EyeOff, Activity,
  Mail, Lock, LogIn, Loader2, Users, ShoppingBag, Calendar, CheckCircle, AlertCircle,
  Play, Plus, Trash2, Building, Building2, ChevronDown, Info, Sun, Moon, PanelLeft, PanelLeftClose,
  List, FolderTree, ChevronsUpDown, ChevronUp, Folder, FolderPen, FolderPlus, CornerDownRight, Tags, MapPin, Home, Package,
  BarChart, LayoutDashboard, RotateCcw, Copy
} from 'lucide-angular/src/icons';
import { routes } from './app.routes';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './core/interceptors/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimations(),
    provideHttpClient(withInterceptors([authInterceptor])), 
    {
      provide: LUCIDE_ICONS,
      useValue: new LucideIconProvider({ 
        Gavel, UserPlus, Zap, Trophy, Eye, Github, Twitter, Linkedin, 
        ArrowRight, Sparkles, Menu, X, ChevronRight, ShieldCheck, EyeOff, Activity,
        Mail, Lock, LogIn, Loader2, Users, ShoppingBag, User, LogOut, Settings, Shield,
        LayoutTemplate, FileText, UserCircle, KeyRound, Pencil, Search, ArrowLeft,
        AlertTriangle, Handshake, MousePointerClick, Unlock, UserMinus, ChevronLeft,
        Calendar, CheckCircle, AlertCircle, Play, Plus, Trash2, Building, Building2, ChevronDown, Info,
        Sun, Moon, PanelLeft, PanelLeftClose, List, FolderTree, ChevronsUpDown, ChevronUp, Folder, FolderPen, FolderPlus, CornerDownRight, Tags, MapPin, Home, Package,
        BarChart, LayoutDashboard, RotateCcw, Copy, Check
      }),
      multi: true,
    },
  ]
};