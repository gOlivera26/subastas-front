import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastContainer } from './shared/ui/toast-container/toast-container';
import { ConfirmationHost } from './shared/ui/confirmation-host/confirmation-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer, ConfirmationHost],
  templateUrl: './app.html',
  styleUrls: ['./app.css'],
})
export class App {}
