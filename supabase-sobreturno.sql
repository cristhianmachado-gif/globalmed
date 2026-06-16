-- ─── MIGRACIÓN: Sobreturno y hora flexible ────────────────────────────────────

-- Agregar campos a turnos
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS es_sobreturno BOOLEAN DEFAULT FALSE;
ALTER TABLE turnos ADD COLUMN IF NOT EXISTS motivo_sobreturno TEXT;

-- El campo hora ya es TIME, lo dejamos como está
-- pero ahora permitimos cualquier valor, no solo slots fijos

-- Índice para detectar sobreturno rápido
CREATE INDEX IF NOT EXISTS idx_turnos_prof_fecha_hora 
  ON turnos(profesional_id, fecha, hora);

-- Vista útil: turnos del día con info de sobreturno
CREATE OR REPLACE VIEW v_agenda_dia AS
SELECT 
  t.*,
  p.nombre AS pac_nombre, p.apellido AS pac_apellido, p.dni AS pac_dni,
  pr.nombre AS prof_nombre, pr.apellido AS prof_apellido,
  pr.hora_inicio, pr.hora_fin, pr.duracion_turno, pr.dias_atencion,
  e.nombre AS especialidad,
  os.nombre AS obra_social_nombre,
  -- Detectar si hay otro turno en el mismo horario con el mismo profesional
  (SELECT COUNT(*) FROM turnos t2 
   WHERE t2.profesional_id = t.profesional_id 
   AND t2.fecha = t.fecha 
   AND t2.hora = t.hora 
   AND t2.id != t.id
   AND t2.estado != 'cancelado') > 0 AS tiene_colision
FROM turnos t
LEFT JOIN pacientes p ON t.paciente_id = p.id
LEFT JOIN profesionales pr ON t.profesional_id = pr.id
LEFT JOIN especialidades e ON pr.especialidad_id = e.id
LEFT JOIN obras_sociales os ON t.obra_social_id = os.id;

-- Habilitar RLS en la vista no aplica, pero sí en tabla base (ya está)
