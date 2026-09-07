# Fronteira in Concert PWA

Festival 10a edicion. 8-11 octubre 2026. Bernardo de Irigoyen, Misiones.

## Como correr

```bash
cd /workspace/fronteira-app
npm install
npm start
```

- App publica: http://localhost:3000
- Panel de edicion (Miguel): http://localhost:3000/admin.html

Contrasena por defecto: fronteira2026
(Se puede cambiar con ADMIN_PASSWORD.)

---

## Como editar el contenido (para Miguel — sin programar)

1. Abri http://localhost:3000/admin.html en el navegador (celular o PC).
2. Ingresa la contrasena y toca Entrar.
3. Completa los formularios en espanol:
   - Inicio: nombre, fechas, texto y logo.
   - Cronograma por dia: actividades (hora, titulo, sede).
   - Sedes: lugares del festival.
   - Orquestas: datos y foto/logo.
   - Quienes apoyan: instituciones y logos.
   - Contacto: WhatsApp, Instagram, email y web.
4. Usa + Agregar para sumar filas y Quitar para borrarlas.
5. Para imagenes: elegi archivo (JPG/PNG/WEBP/GIF/SVG, max 5 MB), toca Subir imagen, mira la miniatura.
6. Toca Guardar cambios (boton dorado).
7. Refresca la app publica (/); los cambios se ven al instante sin rebuild.

Marca Ejemplo (placeholder) solo en items de prueba.

Consejos: el panel es mobile-friendly; Recargar restaura lo guardado; Salir cierra sesion.

---

## API (referencia tecnica)

- GET /api/content — lee data/content.json
- POST /api/content — guarda JSON (header X-Admin-Password)
- POST /api/upload — guarda en public/uploads/ y devuelve { url } (header X-Admin-Password)

Campos de imagen opcionales: festival.logo, orquestas[].imagen, apoyan[].imagen.

## Secciones de la app publica

1 Inicio / 2 Cronograma / 3 Sedes / 4 Orquestas / 5 Quienes apoyan / 6 Inscripcion / 7 Contacto

## PWA

manifest + icons + service worker. Instalar: Agregar a pantalla de inicio (HTTPS fuera de localhost).

## Contacto

WhatsApp 3741-407013
Instagram @fronteirainconcert
Email asociacioncivilallegro@gmail.com
Web www.asociacioncivilallegro.com.ar

Asociacion Civil Allegro — Personeria Juridica A-4656 — Miguel Angel Noguera
