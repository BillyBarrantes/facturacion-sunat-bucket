---
name: secure-frontend
description: Reglas de seguridad específicas para el frontend (Next.js App Router + React 19). Extiende secure-coding-standard. Úsala al crear o modificar páginas, componentes, manejo de sesión, llamadas API desde el cliente, o configuraciones de Next.js. No la uses para reglas de seguridad genéricas (ver secure-coding-standard) ni para backend (ver secure-backend).
---

# Seguridad Frontend — Next.js + React

Esta skill extiende `secure-coding-standard` con reglas específicas para el frontend.

## 1. Manejo de Sesión y Tokens

- **Regla 1.1**: No almacenar tokens JWT en `localStorage` ni `sessionStorage`. Usar **httpOnly cookies** con Supabase SSR (`@supabase/ssr`) para tokens de sesión.
- **Regla 1.2**: Si por limitaciones del entorno se usa localStorage como transición, documentar como deuda técnica con un ticket de remediación. No considerar como solución permanente.
- **Regla 1.3**: El token de sesión no debe exponerse en URLs, query params ni headers personalizados accesibles desde JavaScript (salvo el header `Authorization` estándar en fetch desde Server Components).
- **Regla 1.4**: No almacenar `company_id` en localStorage sin verificar que pertenece al usuario autenticado. Obtenerlo desde el perfil del token.

## 2. Llamadas API

- **Regla 2.1**: Las llamadas a la API backend deben hacerse desde **Server Components** o **Route Handlers** cuando involucren datos sensibles o lógica de negocio. Minimizar llamadas desde el cliente.
- **Regla 2.2**: La URL base de la API (`NEXT_PUBLIC_API_URL`) debe configurarse en variable de entorno. No tener fallbacks hardcodeados a dominios de producción en el código fuente. Si hay fallback, que apunte a `localhost` para desarrollo.
- **Regla 2.3**: No enviar `service_role_key` ni ninguna clave de servicio desde el frontend. El frontend solo usa `anon_key` de Supabase.
- **Regla 2.4**: Validar en el frontend los datos antes de enviarlos, pero **no confiar en la validación del frontend como única defensa**. El backend siempre debe re-validar.

## 3. Content Security Policy (CSP)

- **Regla 3.1**: Configurar headers CSP en `next.config.ts` o en `vercel.json`. Restringir `script-src`, `style-src`, `img-src`, `connect-src` a orígenes conocidos.
- **Regla 3.2**: No usar `'unsafe-inline'` en `script-src`. Usar nonces o hashes para scripts inline.
- **Regla 3.3**: Si se cargan imágenes desde dominios externos (R2, Supabase Storage), listarlos en `img-src`.
- **Regla 3.4**: Configurar `frame-ancestors 'none'` para prevenir clickjacking.

## 4. XSS y Sanitización

- **Regla 4.1**: No usar `dangerouslySetInnerHTML` en React. Si es inevitable (HTML de ticket), sanitizar con DOMPurify del lado del servidor.
- **Regla 4.2**: Escapar cualquier valor dinámico que se renderice en el template HTML de tickets (`pdf_generator.py` usa una template string). Los valores del cliente (`razon_social`, `direccion`) deben escaparse.
- **Regla 4.3**: No interpolar datos del usuario directamente en URLs de redirección ni en etiquetas `<a href>`. Validar que sea una URL esperada.

## 5. Variables de Entorno

- **Regla 5.1**: Solo las variables prefijadas con `NEXT_PUBLIC_` son accesibles desde el cliente. No exponer secrets bajo ningún otro nombre.
- **Regla 5.2**: No incluir `SUPABASE_SERVICE_ROLE_KEY` ni `GEMINI_API_KEY` en el frontend bajo `NEXT_PUBLIC_*`.
- **Regla 5.3**: Validar en build time que las variables `NEXT_PUBLIC_*` necesarias estén definidas.

## 6. Server Components vs Client Components

- **Regla 6.1**: Por defecto, los componentes son Server Components. Solo marcar `'use client'` cuando se necesite interactividad (eventos, hooks, estado, efectos del navegador).
- **Regla 6.2**: La lógica de acceso a datos (fetch a API) debe estar en Server Components o Route Handlers siempre que sea posible. No hacer fetch de datos sensibles desde el cliente.
- **Regla 6.3**: Los secrets de API externas nunca deben pasarse como props a Client Components.

## 7. Dependencias Frontend

- **Regla 7.1**: Evaluar el tamaño de bundle de cada dependencia antes de agregarla. Preferir iconos bajo demanda (`lucide-react` tree-shakeable) sobre librerías de iconos completas.
- **Regla 7.2**: No agregar librerías de gráficos, charting o UI completas sin evaluar si realmente se necesitan. El proyecto actual no tiene librerías UI externas (solo Tailwind). Mantener esa disciplina.
- **Regla 7.3**: Ejecutar `npm audit` en cada build de CI. No permitir dependencias con severidad CRITICAL o HIGH sin fix.

## 8. Configuración de Next.js

- **Regla 8.1**: En `next.config.ts`, configurar `poweredByHeader: false` para ocultar el header `X-Powered-By`.
- **Regla 8.2**: Configurar `images.remotePatterns` si se cargan imágenes desde R2 o Supabase Storage.
- **Regla 8.3**: No deshabilitar la verificación de ESLint en el build (`eslint.ignoreDuringBuilds: true`). El build debe fallar si hay errores de lint.
