<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->


# Estructura del proyecto

Next.js App Router con Supabase como backend. App móvil-first con diseño oscuro y acento dorado (`#c8a96e`).

```
src/
├── app/
│   ├── (auth)/login/        → Página de login (Supabase Auth)
│   ├── (app)/               → Rutas protegidas (layout con BottomNav)
│   │   ├── home/            → Lista de listas del usuario
│   │   ├── profile/         → Perfil y estadísticas
│   │   └── list/[id]/       → Detalle de una lista (Server Component)
│   └── page.tsx             → Redirige a /home
├── components/
│   ├── ListDetailClient.tsx → Vista de detalle de lista (Client Component, Realtime)
│   ├── ShareModal.tsx       → Modal para compartir/gestionar colaboradores
│   ├── AddItemModal.tsx     → Modal para añadir items
│   ├── CreateListModal.tsx  → Modal para crear listas
│   ├── RankItem.tsx         → Item de la lista con votos
│   ├── ListCard.tsx         → Tarjeta de lista en home
│   ├── BottomNav.tsx        → Navegación inferior (Home / Perfil)
│   └── LogoutButton.tsx     → Botón de cerrar sesión
└── lib/supabase/
    ├── client.ts            → Cliente browser (componentes client)
    ├── server.ts            → Cliente servidor (Server Components y middleware)
    └── types.ts             → Tipos del schema de Supabase (actualizar al añadir tablas/funciones)
```

## Patrones clave

- **Server Components** fetchan datos directamente con `createClient()` de `@/lib/supabase/server`.
- **Client Components** usan `createClient()` de `@/lib/supabase/client` para mutaciones y Realtime.
- **Middleware** (`middleware.ts`) gestiona la protección de rutas: redirige a `/login` si no autenticado.
- **Realtime** activo en `items` y `list_members` vía `supabase_realtime` publication.
- Los Server Components de detalle (`list/[id]/page.tsx`) pasan datos iniciales como props al Client Component.

## Autenticación

Supabase Auth con email/password. Al crear usuario, un trigger crea automáticamente una fila en `profiles`. El middleware refresca la sesión en cada request.

# Base de datos: arquitectura

Supabase con las siguientes tablas (ver `supabase/schema.sql` para el schema completo):

- `profiles` — usuarios (1:1 con `auth.users`, se crea automáticamente via trigger)
- `lists` — listas de items, cada una tiene un `owner_id`
- `list_members` — relación N:M entre listas y usuarios colaboradores
- `items` — elementos de una lista, con votos y estado completado
- `votes` — un voto por usuario por lista por día (`unique (user_id, list_id, voted_date)`)

Todas las tablas tienen RLS habilitado. Funciones RPC disponibles: `get_profile_by_email`, `get_list_owner_id`.

# Base de datos: migraciones

- Para cambios en la base de datos, crear un archivo nuevo en `supabase/migrations/` con el SQL incremental.
- Nunca re-ejecutar `supabase/schema.sql` completo en producción — es solo el estado inicial.
- Actualizar también `supabase/schema.sql` para que refleje el estado final tras la migración.

# Base de datos: RLS sin recursión

Las políticas RLS nunca deben crear dependencias circulares entre tablas. Si una política de la tabla A referencia la tabla B, la tabla B no puede referenciar A en su propia política.

Para romper ciclos, usar funciones `SECURITY DEFINER` que consultan la tabla sin pasar por RLS. Ver `supabase/migrations/fix_rls_recursion.sql` como ejemplo.

# Antes de hacer commit

Siempre ejecutar `npm run build` antes de hacer commit. Si el build falla, corregir los errores antes de continuar. No hacer commit de código que no compila.

# Skills disponibles

Usa el skill tool para invocarlos por nombre.

| Skill | Cuándo usarlo |
|---|---|
| `commit-commands:commit` | Crear un commit sin abrir PR |
| `commit-commands:commit-push-pr` | Terminar una tarea: commit + push + PR en un paso |
| `commit-commands:clean_gone` | Limpiar ramas locales ya mergeadas y borradas en remoto |
| `simplify` | Pulir el código recién escrito: eliminar redundancias, mejorar calidad |
| `claude-md-management:revise-claude-md` | Guardar aprendizajes de la sesión en AGENTS.md |
| `claude-md-management:claude-md-improver` | Auditar y mejorar todas las instrucciones del repo |
| `update-config` | Configurar permisos, hooks o variables de entorno en Claude Code |