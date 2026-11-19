import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render header brand', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Tienda');
  });

  it('links departments by their backend ID and offers by their dedicated filter', async () => {
    const fixture = TestBed.createComponent(App);
    TestBed.inject(HttpTestingController).expectOne(req => req.url.endsWith('/categorias'))
      .flush([{ id: 42, nombre: 'Hogar y cocina' }]);
    fixture.componentInstance.showMenu = true;
    fixture.detectChanges();
    const links = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('a'));
    expect(links.find(link => link.textContent?.trim() === 'Hogar y cocina')?.getAttribute('href'))
      .toBe('/productos?categoriaId=42');
    expect(links.find(link => link.textContent?.trim().endsWith('Ofertas'))?.getAttribute('href'))
      .toBe('/productos?soloOfertas=true');
  });
});
