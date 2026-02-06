import { Component } from '@angular/core';
import { BrandingService } from './core/services/branding.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'eusa-quiz';

  constructor(private brandingService: BrandingService) { }
}
