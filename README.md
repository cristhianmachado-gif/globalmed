# GlobalMed — Sistema de Gestión de Salud

Stack: **Next.js 14 + Supabase + Vercel + Tailwind CSS**

---

## 🚀 Guía de instalación paso a paso

### 1. Supabase (base de datos y autenticación)

1. Crear cuenta en [supabase.com](https://supabase.com)
2. **New project** → Nombre: `globalmed` → elegir región South America
3. Ir a **SQL Editor** y pegar el contenido de `supabase-schema.sql` → Run
4. En **Authentication > Settings**:
   - Desactivar "Enable email confirmations" (para que sea más simple al inicio)
5. En **Authentication > Users** → crear los usuarios manualmente:
   - `admin@globalmed.com.ar` / contraseña fuerte → rol: administrador
   - `recepcion@globalmed.com.ar` / contraseña → rol: administrativo
   - Médicos con su email institucional → rol: profesional
6. Después de crear cada usuario en Auth, insertar su perfil en la tabla `perfiles`:
   ```sql
   INSERT INTO perfiles (id, nombre, apellido, rol)
   VALUES ('<uid-del-usuario>', 'Carlos', 'Méndez', 'administrador');
   ```
7. Ir a **Settings > API** y copiar:
   - `Project URL`
   - `anon public key`

### 2. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Editar `.env.local` con los valores de Supabase:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 3. Correr localmente

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

### 4. GitHub

```bash
git init
git add .
git commit -m "GlobalMed inicial"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/globalmed.git
git push -u origin main
```

### 5. Vercel (deploy automático)

1. Ir a [vercel.com](https://vercel.com) → New Project
2. Importar el repositorio de GitHub
3. En **Environment Variables** agregar las mismas del `.env.local`
4. Deploy → en ~2 minutos tiene URL pública

**Cada vez que hacés `git push`, Vercel redeploya automáticamente.**

---

## 📱 Mobile

El sistema es responsive. En celular:
- Sidebar como drawer (hamburger menu)
- Tablas con scroll horizontal
- Modales full-screen

## 🗂 Estructura del proyecto

```
globalmed/
├── app/
│   ├── auth/login/       → Página de login
│   ├── dashboard/        → Panel principal
│   ├── agenda/           → Calendario de turnos
│   ├── pacientes/        → Gestión de pacientes
│   ├── profesionales/    → Gestión de profesionales
│   ├── turnos/           → Listado de turnos
│   ├── hc/               → Historias clínicas
│   ├── mensajes/         → Mensajería interna
│   ├── obras-sociales/   → ABM obras sociales
│   └── config/           → Configuración del centro
├── components/
│   ├── layout/Sidebar    → Navegación responsive
│   └── ui/               → Componentes reutilizables
├── lib/
│   ├── supabase/         → Cliente Supabase
│   └── utils.ts          → Utilidades
├── types/index.ts        → Tipos TypeScript
├── middleware.ts         → Protección de rutas
└── supabase-schema.sql   → Schema completo de DB
```

## 🔐 Roles y permisos

| Módulo | Administrador | Administrativo | Profesional |
|---|---|---|---|
| Panel | ✅ | ✅ | ✅ |
| Agenda | ✅ | ✅ | ✅ |
| Pacientes | ✅ | ✅ (sin HC) | ✅ |
| Profesionales | ✅ | ✅ (solo ver) | ❌ |
| Turnos | ✅ | ✅ | ✅ (propios) |
| Historia clínica | ✅ | ❌ | ✅ |
| Mensajes | ✅ | ✅ | ✅ |
| Obras sociales | ✅ | ❌ | ❌ |
| Configuración | ✅ | ❌ | ❌ |
