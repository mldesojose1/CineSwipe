# Architecture Decision Records (ADR) — CineSwipe (Fase 1)

**Estado:** Finalizando Fase 1  
**Propósito:** Documentar las decisiones fundamentales de arquitectura e infraestructura tomadas durante el desarrollo inicial del proyecto para el equipo técnico y evaluación del _Capstone_.

---

## Resumen de Decisiones

| ID | Tema | Decisión | Estado |
|---|----|--------|------|
| [ADR-001](#adr-001-gestión-de-estado-global) | Gestión de Estado Global | React Context + useReducer | Aprobada |
| [ADR-002](#adr-002-implementación-de-gestos-táctiles) | Gestos Táctiles (Swipe) | Vanilla Pointer Events API | Aprobada |
| [ADR-003](#adr-003-proveedor-de-back-end-de-películas) | Proveedor de Datos de Películas | TMDB API v3 | Aprobada |
| [ADR-004](#adr-004-delegación-ia-vs-desarrollo-manual) | Metodología de Desarrollo IA | Prompts vs Manual | Informativa |

---

## ADR-001: Gestión de Estado Global

**Contexto:**  
CineSwipe necesita mantener un estado persistente (en `localStorage`) de las películas deslizadas y los filtros activos (género, año), además de asegurar el ruteo. Las opciones principales para React varían desde contexto nativo hasta librerías externas pesadas.

**Decisión:**  
Se decidió utilizar **React Context combinado con `useReducer`** dividiendo las suscripciones en dos contextos separados (Estado Lectura vs. Dispatch Escritura) en lugar de adoptar Redux o Zustand.

**Alternativas Consideradas:**
*   **Redux Toolkit:** Demasiado _boilerplate_ para el estado mínimo y de dominio puramente local que requiere CineSwipe en su versión inicial.
*   **Zustand:** Excelente, ligero y sin el problema del "Context Hell" de React, pero añadía una dependencia externa que se deseaba evitar según las directrices coreanas de la arquitectura de la Fase 1 (no librerías de estado externas).

**Consecuencias Positivas:**
*   No hay dependencias de terceros; menor tamaño en el bundle final.
*   El código es fácil de entender con conocimiento nativo de React.
*   La separación de contextos asegura que los componentes que solo "despachan" acciones no se re-rendericen cuando cambie el historial.

**Consecuencias Negativas (Limitaciones):**
*   Los componentes que consuman lectura (`useMovieHistory`) se re-renderizarán forzosamente completos en cada swipe.
*   Serializar/deserializar 50 objetos síncronamente en `localStorage` con cada _swipe_ podría causar ligeros micro-cortes si el historial creciese o los objetos fuesen excesivamente grandes.

---

## ADR-002: Implementación de Gestos Táctiles

**Contexto:**  
La mecánica interactiva principal ("Tinder-style swipe") requiere un seguimiento preciso del cursor/dedo, el arrastre de la tarjeta (drag) y una evaluación direccional para invocar acciones (Like/Dislike).

**Decisión:**  
Se decidió utilizar **Vanilla JavaScript Pointer Events (`onPointerDown`, `onPointerMove`, `onPointerUp`)** atados a los manejadores de eventos nativos de React en lugar de utilizar librerías de gestos y animación.

**Alternativas Consideradas:**
*   **Framer Motion (useDrag):** Resolución premium con simulación física (spring physics) nativa, de muy fácil implementación para esta mecánica en específico.
*   **React-Use-Gesture:** Muy estandarizada y específica para arrastres.

**Consecuencias Positivas:**
*   Ahorro absoluto en peso del paquete JS (sin Framer o React-spring sumando KB).
*   Abstracción cero; absoluto control manual sobre los umbrales de drag y la lógica de cancelación (ej. _Keyboard Fallbacks_ implementados en el mismo plano).

**Consecuencias Negativas (Limitaciones):**
*   La respuesta de animación es lineal (`transition: transform ease`), perdiendo la fluidez, resiliencia elástica de bordes, y _spring physics_ de alta calidad que esperarías de apps nativas que sí ofrecen librerías como Framer Motion.
*   Mayor costo de mantenimiento al tener que encargarse programáticamente de las salidas repentinas o cierres táctiles complejos.

---

## ADR-003: Proveedor de Back-End de Películas

**Contexto:**  
La plataforma debe nutrirse de información verídica, pósters de alta resolución de películas y ofrecer filtrado por fecha y categoría de manera rápida, preferiblemente con capas de popularidad.

**Decisión:**  
Se escogió implementar la conectividad fundamental contra **The Movie Database (TMDB) API v3** en sus rutas `/discover/movie`.

**Alternativas Consideradas:**
*   **OMDb API:** Ofrece buena cantidad pero requiere suscripción Patreon para posters en Alta Definición y sus endpoints de filtrado numérico complejo (llegada+año) son pobres comparados.
*   **IMDb Unofficial Scrapers:** Riesgo gigante a bloqueos (Rate-limiting hostil), inestables, no aptos para una app de demostración continua.

**Consecuencias Positivas:**
*   Robustez de catálogo; pósters oficiales y escalables mediante CDN integrados.
*   Filtro `discover` extremadamente sofisticado (maneja popularidad, rangos numéricos de ID base, géneros superpuestos en una sola llamada).

**Consecuencias Negativas (Limitaciones):**
*   Políticas corporativas de TMDB y bloqueos de IPs eventuales; obliga a gestionar los tokens con cuidado y ocultar la `VITE_TMDB_KEY`.
*   Requiere a veces cruzar endpoints dispares (e.g., llamar separadamente al point de `/genres` en la UI porque `discover` entrega IDs sin strings formateados).

---

## ADR-004: Delegación IA vs Desarrollo Manual

**Contexto:**  
Con herramientas y agentes (Antigravity/GenAI) a disposición, el flujo de desarrollo ha cambiado dramáticamente comparado al flujo de teclado convencional. Era necesario estipular los bordes entre qué decide el equipo técnico y qué programa el asistente de inteligencia artificial.

**Decisión:**  
Se decidió utilizar **Ingeniería Prompt Driven**: la definición arquitectónica limitante la pone el ser humano en _Prompts Estrictos_, y la codificación algorítmica la ejecuta el Agente (IA) a través de herramientas de Auto-Código y CLI.

**Distribución Especificada:**
*   **Responsabilidad Humana (Manual):** Identificación del _stack_ requerido, delineamiento de reglas (Ej: no instalar estado global de terceros, límite de carpetas), aprobación de revisiones críticas y testing perceptual interactivo.
*   **Responsabilidad de la IA (Agente Delegado):** Escritura y estructura de plantillas, validación JSON y guardias de tipo TypeScript estricto, _scaffolding_ total de carpetas y ficheros en Windows Terminal o PowerShell y formulación del React boilerplate.

---

## Próximas Decisiones Pendientes (Fase 2)

A medida que el proyecto pase de la conceptualización a algo transaccional de los usuarios, la directiva deberá debatir los siguientes temas:

1.  **DB Backend:** Si el historial de _Likes/Dislikes_ debe persistirse en una nube real mediante Firebase Auth/Firestore o Supabase y no limitarse a `localStorage`.
2.  **Animations:** Integrar de cara al usuario final Framer Motion de manera definitiva para suplir la fricción estática del Gesture API que tenemos hoy en día.
3.  **UI Library vs Utility First:** La migración eventual a Radix UI o Headless UI para los componentes genéricos (`Modal`, `Popovers`), reemplazando el marcado exclusivo de Tailwind crudo.
