<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Workflow: tareas → PR automática

Cuando el usuario pida una tarea de desarrollo, una vez finalizada **siempre**:

1. Usa el skill `commit-commands:commit-push-pr` para crear una rama descriptiva, hacer commit de los cambios, push al repositorio y abrir una Pull Request en GitHub.
2. El nombre de la rama debe seguir el formato `feat/<descripcion-corta>` o `fix/<descripcion-corta>`.
3. La descripción de la PR debe resumir qué se hizo y por qué.
4. Vercel comentará automáticamente la preview URL en la PR — no es necesario buscarla manualmente.

No hacer push ni PR si el usuario está solo explorando o preguntando, únicamente cuando haya cambios de código concretos que validar.
