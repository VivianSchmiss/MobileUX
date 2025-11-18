import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppRootComponent } from './app/app';
import { FormsModule } from '@angular/forms';

bootstrapApplication(AppRootComponent, appConfig).catch((err) => console.error(err));
