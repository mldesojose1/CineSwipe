# Delegation Framework — CineSwipe

**Basado en:** Análisis de 10 escenarios de delegación evaluados en producción  
**Fecha de análisis:** 2026-04  
**Documentos relacionados:** [`GOVERNANCE.md`](./GOVERNANCE.md), [`SECURITY.md`](./SECURITY.md)

---

## Resumen ejecutivo

De los 10 escenarios evaluados, 8 fueron delegados al agente, 2 se reservaron
para decisión manual, y ninguno requirió supervisión intermedia. La categoría
**"supervisar"** nunca fue elegida, lo que revela un patrón binario en la toma
de decisiones: o el agente hace la tarea de forma autónoma, o la persona la hace
íntegramente. Esto es coherente con equipos pequeños donde el overhead de revisar
a medias una tarea puede costar más que hacerla completo.

El criterio dominante en las decisiones fue **el tipo de consecuencia**, no la
complejidad técnica. Tareas técnicamente difíciles (escenario 8: refactorizar
`useMovies.ts`) se delegaron; tareas simples pero con consecuencias legales o
de privacidad (escenario 6: política GDPR) se reservaron.

**Inconsistencias detectadas:** 2 decisiones contradicen documentos ya establecidos
en este mismo repositorio. Ver §Inconsistencias.

---

## Los 10 escenarios y sus decisiones

| # | Escenario | Archivo afectado | Decisión | Tipo de consecuencia |
|---|---|---|---|---|
| 1 | Agregar campo `director` a SwipeCard | `SwipeCard.tsx` | **Delegar** | Reversible, UI |
| 2 | Migrar `MovieContext` de `useReducer` a Zustand | `MovieContext.tsx` | **Delegar** | Reversible, arquitectónica |
| 3 | Tests de regresión para el bug de swipe duplicado (Lab 7) | `__tests__/` | **Manual** | Conocimiento contextual |
| 4 | Configurar variables de entorno en Vercel Dashboard | Panel Vercel | **Delegar** | Irreversible, credenciales |
| 5 | Generar `SECURITY.md` con política de secretos | `SECURITY.md` | **Delegar** | Reversible, documentación |
| 6 | Decidir qué datos recopilar para analytics (GDPR) | `MovieContext.tsx` | **Manual** | Legal / privacidad |
| 7 | Escribir `README.md` con instrucciones de setup | `README.md` | **Delegar** | Reversible, documentación |
| 8 | Refactorizar `useMovies.ts` para búsqueda por texto | `useMovies.ts` | **Delegar** | Reversible, lógica de negocio |
| 9 | Aprobar PR con 300 líneas de código IA sin tests | GitHub PR | **Delegar** | Irreversible, calidad |
| 10 | Crear job de deploy en GitHub Actions (→ Vercel) | `.github/workflows/` | **Delegar** | Parcialmente reversible, CI |

---

## Matriz de decisión

Esta matriz es **agnóstica al proyecto** — funciona para CineSwipe y para proyectos futuros.
Para usarla: responde las preguntas en orden; la primera respuesta afirmativa determina el resultado.

| Criterio | Pregunta | Si SÍ | Si NO |
|---|---|---|---|
| **C1 · Consecuencia legal o de privacidad** | ¿La tarea implica decidir qué datos recopilar, cómo almacenarlos, o compliance regulatorio? | **Manual** | → C2 |
| **C2 · Conocimiento contextual irrecuperable** | ¿La tarea requiere entender el *por qué* de un bug específico que solo quien lo debuggeó conoce? | **Manual** | → C3 |
| **C3 · Credenciales reales de producción** | ¿La tarea implica leer, escribir o rotar secretos, API keys, o acceder a paneles con credenciales reales? | **Supervisar** ¹ | → C4 |
| **C4 · Reversibilidad** | ¿El error más probable es fácilmente revertible con un `git revert` o un redeploy? | **Delegar** | → C5 |
| **C5 · Tests existentes** | ¿Hay tests que detectarían un bug introducido por el agente? | **Delegar** | → C6 |
| **C6 · Impacto en usuarios actuales** | ¿Un error en esta tarea rompería la experiencia de usuarios en producción en menos de 5 minutos? | **Supervisar** | **Delegar** |

¹ *"Supervisar"* aquí significa: el agente prepara los pasos, un humano los ejecuta manualmente.

### Ejemplo aplicado a los escenarios de CineSwipe

```
Escenario 3 (tests de regresión bug swipe):
  C1 → No / C2 → SÍ (solo quien debuggeó el Lab 7 conoce el root cause)
  → Manual ✓

Escenario 6 (política GDPR):
  C1 → SÍ (decisión sobre datos de usuario)
  → Manual ✓

Escenario 8 (refactorizar useMovies.ts):
  C1 → No / C2 → No / C3 → No / C4 → SÍ (reversible con git revert)
  → Delegar ✓

Escenario 10 (job de deploy en GitHub Actions):
  C1 → No / C2 → No / C3 → No / C4 → No (un error en CI bloquea todos los deploys)
  C5 → No (no hay tests para el pipeline mismo) / C6 → No (no rompe usuarios, solo el deploy)
  → Delegar (límite con Supervisar)
```

---

## Análisis de patrones

### Patrón 1 — El tipo de consecuencia supera a la complejidad técnica

La dificultad técnica no fue un factor predictor de la decisión. Los escenarios
más complejos técnicamente (2: migrar a Zustand, 8: refactorizar `useMovies.ts`,
10: CI/CD) se delegaron. Los más simples (6: decidir política GDPR) se reservaron.

**Factor real:** ¿Quién tiene que responsabilizarse del resultado?

- Si el resultado es software → el agente puede generarlo, un humano lo verifica
- Si el resultado es una decisión de negocio o legal → la responsabilidad no se puede delegar

### Patrón 2 — La documentación siempre se delega

Los escenarios 5 (`SECURITY.md`), 7 (`README.md`) y el presente documento fueron
delegados sin dudarlo. Esto es coherente: la documentación es un artefacto de
conocimiento, no una decisión. El agente puede sintetizar y escribir; la decisión
de qué politica tener (escenario 6) es humana.

**Límite claro:** Generar el documento de política → Delegar.
Decidir el contenido de la política → Manual.

### Patrón 3 — El contexto de un bug es intransferible

El escenario 3 (tests de regresión para el bug del Lab 7) fue el único caso
técnico reservado para ejecución manual. La razón implícita: quien debuggeó el
bug sabe qué comportamientos inesperados buscar, qué estados corner-case provocaron
el problema, y cómo reproducirlo. Un agente que no vivió el proceso de debug
escribe tests que verifican el comportamiento *descrito*, no el comportamiento
*problemático*.

**Regla emergente:** Tests para features nuevas → Delegar.
Tests de regresión para bugs que ya ocurrieron → Manual o co-piloteado.

### Patrón 4 — La categoría "Supervisar" nunca fue elegida

En 10 escenarios, no se eligió supervisión intermedia ni una sola vez. Esto puede
indicar dos cosas:
- El equipo tiene confianza alta en el agente para las tareas delegadas, o
- El costo cognitivo de "revisar a medias" es percibido como mayor que hacer la tarea manualmente

Para equipos de 1-3 personas esto es probablemente correcto: la supervisión
continua consume el tiempo que se quería ahorrar delegando.

---

## Inconsistencias detectadas

Ser honesto sobre estas contradicciones es más útil que ignorarlas.

### ⚠️ Inconsistencia 1 — Escenario 9 vs. GOVERNANCE.md

**Decisión tomada:** Delegar "aprobar el merge de un PR con 300 líneas de código IA sin tests"

**Contradicción:** `GOVERNANCE.md` establece explícitamente:
> *"Si el agente modifica alguno de estos archivos y el diff supera 50 líneas cambiadas,
> pedir al agente que lo divida en commits más pequeños antes de revisar."*

Y la checklist de review incluye:
> *"Existe al menos 1 test por cada rama lógica nueva"*

Un agente no puede aprobar un PR — eso es siempre una acción humana. Interpretar
que "delegar" significa "que el agente revise en vez del humano" contradice el
principio central de GOVERNANCE.md: **la aprobación final es siempre humana**.

**Interpretación más caritativa:** La intención era delegar la *generación de los
tests faltantes* antes de aprobar, no delegar la *decisión de aprobar sin tests*.
Si eso es correcto, la respuesta debería haber sido "Supervisar" (el agente genera
tests; el humano aprueba cuando estén listos).

**Conclusión:** Esta decisión requiere corrección. Un PR sin tests no debe ser
aprobado, independientemente de quién lo revise.

---

### ⚠️ Inconsistencia 2 — Escenario 4 vs. SECURITY.md

**Decisión tomada:** Delegar "configurar variables de entorno de producción en Vercel Dashboard"

**Contradicción:** `SECURITY.md` lista explícitamente en "Tareas que NUNCA deben delegarse":
> *"Configurar o modificar variables de entorno en Vercel Dashboard → Hacerlo manualmente en el dashboard"*

El acceso al panel de Vercel implica credenciales de cuenta y puede exponer el
`VITE_TMDB_KEY` real durante la sesión. Incluso si el agente solo "prepara los
pasos", ejecutar esos pasos en el panel es una acción manual por definición
(el agente no tiene acceso al dashboard).

**Conclusión:** Esta tarea es de categoría "Supervisar" a lo sumo — el agente
describe qué configurar, el humano ejecuta los clics. Marcarla como "Delegar"
genera ambigüedad peligrosa en el onboarding.

---

## Las 3 Reglas de Oro

Extraídas de los patrones y corregidas por las inconsistencias.

---

### 🥇 Regla 1: Delega la generación, nunca la decisión

**Formulación:** El agente puede producir cualquier artefacto — código, documento,
configuración, tests — pero la decisión de si ese artefacto va a producción
la toma siempre un humano.

**Por qué es accionable:** Antes de delegar una tarea, pregúntate:
*"¿Hay una decisión al final de esta tarea?"* Si la respuesta es sí, la tarea
es "Supervisar" (agente genera, humano decide), no "Delegar".

**Aplicado a CineSwipe:**
- Generar `SECURITY.md` → Delegar (el artefacto es el output)
- Decidir política GDPR → Manual (la decisión es el output)
- Generar PR con refactor de `useMovies.ts` → Delegar
- Aprobar merge de ese PR → Supervisar/Manual

**Fuera de CineSwipe:**
- Generar queries SQL de migración → Delegar
- Decidir si ejecutar la migración en producción → Manual

---

### 🥈 Regla 2: Las consecuencias irreversibles escalan un nivel

**Formulación:** Si una tarea delegable produciría una consecuencia difícil
de revertir — credenciales expuestas, datos de usuarios afectados, historial
de git reescrito — sube su categoría un nivel: Delegar → Supervisar, Supervisar → Manual.

**Por qué es accionable:** Evalúa el *peor caso razonable*, no el caso esperado.
El agente hace bien la tarea el 95% de las veces. La regla se aplica para el 5%.

**Tabla de escalado:**

| Tarea base | Consecuencia irreversible | Categoría real |
|---|---|---|
| Escribir `.github/workflows/ci.yml` | Un CI roto bloquea todos los deploys | Supervisar |
| Actualizar `vercel.json` headers | CSP mal configurado bloquea la app | Supervisar |
| Generar tests nuevos | Bajo — un test falso pasa el CI pero no rompe usuarios | Delegar |
| Configurar env vars en Vercel | Expone token real durante el proceso | Manual |
| Aprobar PR de 300 líneas sin tests | Bugs en producción sin forma de detectarlos | Manual hasta tener tests |

---

### 🥉 Regla 3: Los tests de regresión los escribe quien vivió el bug

**Formulación:** Cuando un bug ocurre en producción, la persona que lo diagnosticó
escribe — o co-pilotea — los tests de regresión. El agente puede ayudar a
estructurar el código del test, pero el caso de prueba específico (el estado
que provocó el bug, los valores corner-case) viene del humano que lo vivió.

**Por qué es accionable:** Es la única regla con una condición de entrada específica:
*"¿Este test verifica un bug que ya ocurrió?"* Si sí → involucra al humano.

**Por qué importa para CineSwipe:**
El bug de swipe duplicado del Lab 7 ocurrió en un estado de `AbortController`
y timing de `useMoviePagination` que solo es evidente si se vio el comportamiento
en vivo. Un agente que recibe solo la descripción del bug puede escribir un test
que pase sin capturar el root cause real. El test da falsa seguridad.

**Fuera de CineSwipe:** Esta regla aplica igual a cualquier bug de concurrencia,
race condition, o comportamiento dependiente de timing que sea difícil de describir
en texto sin haberlo observado.

---

## Resumen visual de principios

```
¿Consecuencia legal/privacidad? ─────────────────────────────► MANUAL
¿Conocimiento de bug específico? ────────────────────────────► MANUAL
¿Acción irreversible + credenciales? ───────────────────────► SUPERVISAR
¿Genera artefacto + hay decisión al final? ─────────────────► SUPERVISAR
¿Genera artefacto + sin decisión crítica? ──────────────────► DELEGAR

Consecuencia irreversible detectada ──── escala un nivel ────► arriba
```

---

## Aplicación a proyectos futuros

Este framework fue destilado de CineSwipe pero no depende de React, TMDB,
ni de ningún stack específico. Los tres ejes que lo hacen portable son:

1. **Tipo de output:** artefacto de software vs. decisión de negocio
2. **Reversibilidad:** ¿se puede deshacer en < 5 minutos?
3. **Conocimiento contextual:** ¿el agente tuvo acceso a la información que generó el problema?

Para calibrarlo a un proyecto nuevo: tomar 5-10 decisiones de delegación reales,
mapearlas en la matriz, e identificar qué criterios no están cubiertos.
Ese gap es la calibración del framework para ese contexto.
