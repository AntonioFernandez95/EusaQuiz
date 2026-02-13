import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { ForgotPasswordComponent } from './pages/forgot-password/forgot-password.component';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: LoginComponent,
    title: 'Iniciar Sesión | CampusQuiz'
  },
  {
    path: 'register',
    component: RegisterComponent,
    title: 'Crear Cuenta | CampusQuiz'
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
    title: 'Recuperar Contraseña | CampusQuiz'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AuthRoutingModule { }
