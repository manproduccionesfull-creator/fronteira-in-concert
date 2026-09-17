# Para que no se pierda lo cargado en admin

## Causa
En Render sin disco, el disco del servicio es temporal: cada Manual Deploy borra fotos nuevas y puede volver un `content.json` viejo.

## Qué hacer (recomendado, Hobby)

1. En GitHub: Settings → Developer settings → Personal access tokens → token con permiso `repo` sobre `fronteira-in-concert`.
2. En Render → servicio fronteira-in-concert → Environment:
   - `GITHUB_TOKEN` = ese token
   - `GITHUB_REPO` = `manproduccionesfull-creator/fronteira-in-concert` (ya default)
   - `GITHUB_BRANCH` = `main`
3. Redesplegar.
4. Al guardar o subir foto, el admin debe decir que quedó en GitHub.

## Extra (más sólido): disco persistente

En Render → Disks → mount `/var/data`, size 1–2 GB.
La app usa `PERSIST_DIR=/var/data` (ver `render.yaml`).

## Comprobar

`GET /api/health` debe mostrar `githubToken: true` y/o `disk: true`.
