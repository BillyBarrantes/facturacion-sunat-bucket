---
name: sunat-ui-design
description: Estándar UI/UX para App SUNAT inspirado en interfaces B2B de alto nivel como Cursor, Linear, Vercel y OpenAI. Evita diseños genéricos de IA, degradados estruendosos y layouts sobrecargados.
---

# Guía de Estilo y UI/UX - App SUNAT

## 1. Filosofía Visual (High-End B2B AI SaaS)
- **Cero degradados genéricos de IA:** Prohibidos los brillos morados/púrpuras estridentes o efectos de Neón innecesarios.
- **Estilo de Referencia:** Estética limpia tipo Linear/Cursor/Vercel. Espaciado amplio, bordes finos de 1px (`border-slate-200 dark:border-slate-800`), tipografía nítida y contraste alto.
- **Tipografía y Números:** Tipografía Sans-Serif limpia (`Inter` o `Geist`). Todos los montos en soles (`S/`), impuestos y correlativos DEBEN usar números tabulares (`font-mono` / `tabular-nums`) para alineación perfecta en tablas.

## 2. Paleta de Colores
- **Fondo Base:** `bg-white` (Modo claro) / `bg-slate-950` (Modo oscuro).
- **Tarjetas y Contenedores:** `bg-slate-50/50` o `bg-white` con `border-slate-200` y sombras ultra sutiles (`shadow-xs`).
- **Color Primario (Acciones):** Negro puro / Zinc oscuro (`bg-slate-900 text-white hover:bg-slate-800` en Light Mode) o Azul Indigo Profundo (`bg-indigo-600 hover:bg-indigo-700`).

## 3. Código de Colores para Estados Tributarios (SUNAT)
Utilizar badges sutiles y bordes finos con esquinas redondeadas (`rounded-md text-xs font-medium`):
- **Aceptado / Emitido:** `bg-emerald-50 text-emerald-700 border border-emerald-200/60`
- **Rechazado / Error:** `bg-rose-50 text-rose-700 border border-rose-200/60`
- **Pendiente / Borrador:** `bg-amber-50 text-amber-700 border border-amber-200/60`
- **Ambiente BETA:** `bg-sky-50 text-sky-700 border border-sky-200/60`
- **Anulado:** `bg-slate-100 text-slate-600 border border-slate-200`

## 4. Componentes y Tablas (Data-Dense)
- **Tablas:** Filas limpias con hover sutil (`hover:bg-slate-50/80`). Encabezados pequeños en mayúsculas sutiles (`text-[11px] font-semibold tracking-wider text-slate-500 uppercase`).
- **Alineación:** Textos a la izquierda, fechas/estados al centro, montos monetarios a la derecha.
- **Modales & Sheets:** Transiciones rápidas, fondos traslucidos con blur (`backdrop-blur-md bg-slate-950/20`).
