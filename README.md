# Petstore API Tests (Playwright)

Suite de pruebas API para Swagger Petstore v2. No hay UI.

## Alcance
- Login (user/login)
- Listar mascotas disponibles
- Consultar mascota por id (con fallback si el id no existe)
- Crear una orden para una mascota

Base URL por defecto: `https://petstore.swagger.io/v2/`

## Requisitos
- Node.js 18+ (recomendado 20+)
- npm

## Instalacion
```bash
npm install
npx playwright install
```

## Configuracion (opcional)
Este repo no versiona `.env` ni reportes. Las variables se leen del entorno. Si no se definen, se usan valores por defecto del proyecto.

Variables disponibles:
- `PETSTORE_BASE_URL`
- `PETSTORE_USER`
- `PETSTORE_PASS`

Ejemplo (bash/zsh):
```bash
PETSTORE_BASE_URL="https://petstore.swagger.io/v2/" PETSTORE_USER="tu-user" PETSTORE_PASS="tu-pass" npm test
```

Ejemplo (PowerShell):
```powershell
$env:PETSTORE_BASE_URL="https://petstore.swagger.io/v2/"; $env:PETSTORE_USER="tu-user"; $env:PETSTORE_PASS="tu-pass"; npm test
```

Opcional: usa `.env.example` como plantilla y exporta las variables con tu shell/CI (no se versiona).

## Ejecutar tests
```bash
npm test
```

## Reporte HTML
Se genera en `playwright-report/index.html`.

Para abrirlo:
```bash
npm run test:report
```

Dentro del reporte vas a ver adjuntos con los JSON de request/response.

## Estructura
- `tests/api/petstore.flow.spec.ts`
- `playwright.config.ts`

## Notas
- El Petstore publico a veces devuelve ids que luego responden 404. La suite valida el id y, si hace falta, crea una mascota.
- Las mascotas creadas se eliminan al final de la ejecucion.
