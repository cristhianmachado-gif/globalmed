-- =====================================================
-- GLOBALMED - Schema completo de base de datos
-- Ejecutar en Supabase SQL Editor (en orden)
-- =====================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── OBRAS SOCIALES ───────────────────────────────────────────────────────────
CREATE TABLE obras_sociales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  codigo TEXT,
  activa BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO obras_sociales (nombre, codigo) VALUES
  ('OSDE', 'OSDE'),
  ('Swiss Medical', 'SWISS'),
  ('Galeno', 'GAL'),
  ('PAMI', 'PAMI'),
  ('Medifé', 'MEDIFE'),
  ('APROSS', 'APROSS'),
  ('IOMA', 'IOMA'),
  ('Particular', 'PART'),
  ('AMEP', 'AMEP'),
  ('Sancor Salud', 'SANC'),
  ('Federada Salud', 'FED'),
  ('OSPAT', 'OSPAT'),
  ('DASPU', 'DASPU'),
  ('Accord Salud', 'ACC'),
  ('Jerárquicos Salud', 'JER');

-- ─── ESPECIALIDADES ───────────────────────────────────────────────────────────
CREATE TABLE especialidades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  activa BOOLEAN DEFAULT TRUE
);

INSERT INTO especialidades (nombre) VALUES
  ('Cardiología'), ('Clínica Médica'), ('Pediatría'), ('Traumatología'),
  ('Neurología'), ('Ginecología'), ('Dermatología'), ('Oftalmología'),
  ('Otorrinolaringología'), ('Psiquiatría'), ('Nutrición'), ('Endocrinología'),
  ('Reumatología'), ('Urología'), ('Gastroenterología'), ('Neumología'),
  ('Infectología'), ('Hematología'), ('Oncología'), ('Cirugía General');

-- ─── PERFILES DE USUARIO (extiende auth.users de Supabase) ──────────────────
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('administrador', 'administrativo', 'profesional')),
  avatar_url TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PROFESIONALES ────────────────────────────────────────────────────────────
CREATE TABLE profesionales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  perfil_id UUID REFERENCES perfiles(id) ON DELETE SET NULL,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  matricula TEXT NOT NULL UNIQUE,
  especialidad_id UUID REFERENCES especialidades(id),
  telefono TEXT,
  email TEXT NOT NULL,
  universidad TEXT,
  anio_egreso TEXT,
  dias_atencion INTEGER[] DEFAULT '{}',  -- 0=Lun, 1=Mar, ..., 5=Sáb
  hora_inicio TEXT DEFAULT '08:00',
  hora_fin TEXT DEFAULT '14:00',
  duracion_turno INTEGER DEFAULT 20,     -- minutos
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PACIENTES ────────────────────────────────────────────────────────────────
CREATE TABLE pacientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL,
  dni TEXT NOT NULL UNIQUE,
  fecha_nacimiento DATE NOT NULL,
  sexo TEXT CHECK (sexo IN ('M', 'F', 'Otro')),
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  ciudad TEXT,
  obra_social_id UUID REFERENCES obras_sociales(id),
  numero_afiliado TEXT,
  grupo_sanguineo TEXT,
  medico_cabecera_id UUID REFERENCES profesionales(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── TURNOS ───────────────────────────────────────────────────────────────────
CREATE TABLE turnos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  hora TIME NOT NULL,
  duracion INTEGER DEFAULT 20,
  tipo TEXT DEFAULT 'consulta' CHECK (tipo IN ('consulta','control','urgente','primera_vez','interconsulta')),
  motivo TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente','confirmado','cancelado','atendido','ausente')),
  obra_social_id UUID REFERENCES obras_sociales(id),
  observaciones TEXT,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HISTORIA CLÍNICA - EVOLUCIONES ──────────────────────────────────────────
CREATE TABLE hc_evoluciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES profesionales(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT DEFAULT 'consulta' CHECK (tipo IN ('consulta','control','urgencia','interconsulta','primera_vez')),
  titulo TEXT NOT NULL,
  subjetivo TEXT,        -- Anamnesis / motivo de consulta
  objetivo TEXT,         -- Examen físico
  diagnostico TEXT,      -- Evaluación / diagnóstico
  plan TEXT,             -- Plan terapéutico
  ta TEXT,               -- Tensión arterial
  fc TEXT,               -- Frecuencia cardíaca
  temperatura TEXT,
  peso TEXT,
  talla TEXT,
  saturacion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HISTORIA CLÍNICA - ESTUDIOS ─────────────────────────────────────────────
CREATE TABLE hc_estudios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID REFERENCES profesionales(id),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  tipo TEXT DEFAULT 'laboratorio' CHECK (tipo IN ('laboratorio','imagen','anatomia','otro')),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  archivo_url TEXT,
  archivo_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HISTORIA CLÍNICA - EPICRISIS ─────────────────────────────────────────────
CREATE TABLE hc_epicrisis (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
  profesional_id UUID NOT NULL REFERENCES profesionales(id),
  fecha_ingreso DATE NOT NULL,
  fecha_egreso DATE NOT NULL,
  diagnostico_ingreso TEXT,
  diagnostico_egreso TEXT NOT NULL,
  procedimientos TEXT,
  indicaciones_alta TEXT,
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── HISTORIA CLÍNICA - ANTECEDENTES ─────────────────────────────────────────
CREATE TABLE hc_antecedentes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE UNIQUE,
  personales TEXT[],
  familiares TEXT[],
  alergias TEXT[],
  medicacion_actual TEXT[],
  vacunas TEXT[],
  habitos TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── MENSAJERÍA INTERNA ───────────────────────────────────────────────────────
CREATE TABLE mensajes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_id UUID NOT NULL REFERENCES perfiles(id),
  to_id UUID NOT NULL REFERENCES perfiles(id),
  asunto TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  leido BOOLEAN DEFAULT FALSE,
  nota_adjunta JSONB,         -- { titulo, contenido, paciente_id? }
  respondiendo_a UUID REFERENCES mensajes(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONFIGURACIÓN DEL CENTRO ────────────────────────────────────────────────
CREATE TABLE configuracion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clave TEXT NOT NULL UNIQUE,
  valor TEXT,
  descripcion TEXT
);

INSERT INTO configuracion (clave, valor, descripcion) VALUES
  ('nombre_centro', 'GlobalMed', 'Nombre del centro médico'),
  ('cuit', '30-71234567-8', 'CUIT del centro'),
  ('direccion', 'Av. Colón 1234', 'Dirección del centro'),
  ('ciudad', 'Córdoba', 'Ciudad'),
  ('telefono', '0351-555-0000', 'Teléfono principal'),
  ('email', 'contacto@globalmed.com.ar', 'Email institucional'),
  ('horario_atencion', 'Lunes a Viernes 7:00–20:00', 'Horario de atención'),
  ('duracion_turno_default', '20', 'Duración default del turno en minutos'),
  ('anticipacion_minima', '60', 'Minutos mínimos de anticipación para reservar'),
  ('logo_url', '', 'URL del logo del centro');

-- ─── ÍNDICES ─────────────────────────────────────────────────────────────────
CREATE INDEX idx_turnos_fecha ON turnos(fecha);
CREATE INDEX idx_turnos_profesional ON turnos(profesional_id);
CREATE INDEX idx_turnos_paciente ON turnos(paciente_id);
CREATE INDEX idx_hc_evo_paciente ON hc_evoluciones(paciente_id);
CREATE INDEX idx_hc_estudios_paciente ON hc_estudios(paciente_id);
CREATE INDEX idx_mensajes_to ON mensajes(to_id, leido);
CREATE INDEX idx_mensajes_from ON mensajes(from_id);

-- ─── ROW LEVEL SECURITY ───────────────────────────────────────────────────────
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pacientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;
ALTER TABLE hc_evoluciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE hc_estudios ENABLE ROW LEVEL SECURITY;
ALTER TABLE hc_epicrisis ENABLE ROW LEVEL SECURITY;
ALTER TABLE hc_antecedentes ENABLE ROW LEVEL SECURITY;
ALTER TABLE mensajes ENABLE ROW LEVEL SECURITY;
ALTER TABLE obras_sociales ENABLE ROW LEVEL SECURITY;
ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados pueden leer/escribir según su rol
-- (Por simplicidad usamos autenticados; en producción agregar chequeo de rol)

CREATE POLICY "Usuarios autenticados leen perfiles"
  ON perfiles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados leen obras_sociales"
  ON obras_sociales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gestiona obras_sociales"
  ON obras_sociales FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados leen especialidades"
  ON especialidades FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados leen profesionales"
  ON profesionales FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gestionan profesionales"
  ON profesionales FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados leen pacientes"
  ON pacientes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gestionan pacientes"
  ON pacientes FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gestionan turnos"
  ON turnos FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gestionan HC evoluciones"
  ON hc_evoluciones FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gestionan HC estudios"
  ON hc_estudios FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gestionan HC epicrisis"
  ON hc_epicrisis FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios autenticados gestionan HC antecedentes"
  ON hc_antecedentes FOR ALL TO authenticated USING (true);

CREATE POLICY "Usuarios ven sus mensajes"
  ON mensajes FOR SELECT TO authenticated
  USING (from_id = auth.uid() OR to_id = auth.uid());

CREATE POLICY "Usuarios envían mensajes"
  ON mensajes FOR INSERT TO authenticated
  WITH CHECK (from_id = auth.uid());

CREATE POLICY "Usuarios marcan leído"
  ON mensajes FOR UPDATE TO authenticated
  USING (to_id = auth.uid());

CREATE POLICY "Usuarios autenticados leen configuracion"
  ON configuracion FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin gestiona configuracion"
  ON configuracion FOR UPDATE TO authenticated USING (true);

-- ─── FUNCIÓN: actualizar updated_at automáticamente ──────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_perfiles_updated_at BEFORE UPDATE ON perfiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profesionales_updated_at BEFORE UPDATE ON profesionales FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_pacientes_updated_at BEFORE UPDATE ON pacientes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_turnos_updated_at BEFORE UPDATE ON turnos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hc_evo_updated_at BEFORE UPDATE ON hc_evoluciones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hc_epi_updated_at BEFORE UPDATE ON hc_epicrisis FOR EACH ROW EXECUTE FUNCTION update_updated_at();
