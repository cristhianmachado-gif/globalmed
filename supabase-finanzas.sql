-- =====================================================
-- GLOBALMED — Schema financiero completo
-- Ejecutar en Supabase SQL Editor DESPUÉS del schema base
-- =====================================================

-- ─── ACUERDOS ECONÓMICOS POR PROFESIONAL ─────────────────────────────────────
CREATE TABLE acuerdos_profesionales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  pct_prof_particular  NUMERIC(5,2) NOT NULL DEFAULT 70.00,
  pct_prof_coseguro    NUMERIC(5,2) NOT NULL DEFAULT 70.00,
  pct_prof_os          NUMERIC(5,2) NOT NULL DEFAULT 65.00,
  -- El % del centro es 100 - pct_prof (calculado, no almacenado)
  vigente_desde DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Solo puede haber un acuerdo vigente por profesional (el más reciente)
CREATE INDEX idx_acuerdos_prof ON acuerdos_profesionales(profesional_id, vigente_desde DESC);

-- ─── ARANCELES ────────────────────────────────────────────────────────────────
-- Precio por profesional × obra social × tipo de turno
CREATE TABLE aranceles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profesional_id UUID NOT NULL REFERENCES profesionales(id) ON DELETE CASCADE,
  obra_social_id UUID REFERENCES obras_sociales(id) ON DELETE CASCADE,
  -- NULL en obra_social_id = particular
  tipo_turno TEXT NOT NULL DEFAULT 'consulta'
    CHECK (tipo_turno IN ('consulta','control','urgente','primera_vez','interconsulta')),
  precio_os    NUMERIC(12,2) NOT NULL DEFAULT 0,   -- lo que paga la OS
  coseguro     NUMERIC(12,2) NOT NULL DEFAULT 0,   -- lo que paga el paciente
  -- Para particular: precio_os = 0, coseguro = precio total
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profesional_id, obra_social_id, tipo_turno)
);
CREATE INDEX idx_aranceles_prof ON aranceles(profesional_id);
CREATE INDEX idx_aranceles_os   ON aranceles(obra_social_id);

-- ─── SEÑAS ────────────────────────────────────────────────────────────────────
CREATE TABLE senias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paciente_id UUID NOT NULL REFERENCES pacientes(id),
  turno_id UUID REFERENCES turnos(id) ON DELETE SET NULL,
  monto NUMERIC(12,2) NOT NULL,
  forma_pago TEXT NOT NULL DEFAULT 'efectivo'
    CHECK (forma_pago IN ('efectivo','transferencia','tarjeta','cheque')),
  estado TEXT NOT NULL DEFAULT 'cobrada'
    CHECK (estado IN ('cobrada','aplicada','retenida','devuelta')),
  fecha_cobro DATE NOT NULL DEFAULT CURRENT_DATE,
  -- Devolución (requiere autorización explícita del admin)
  devolucion_autorizada BOOLEAN DEFAULT FALSE,
  devolucion_autorizada_por UUID REFERENCES perfiles(id),
  devolucion_fecha DATE,
  motivo_devolucion TEXT,
  -- Quién la cobró
  cobrado_por UUID REFERENCES perfiles(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_senias_paciente ON senias(paciente_id);
CREATE INDEX idx_senias_turno    ON senias(turno_id);
CREATE INDEX idx_senias_estado   ON senias(estado);

-- ─── COBROS AL PACIENTE ───────────────────────────────────────────────────────
CREATE TABLE cobros_paciente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_id UUID NOT NULL REFERENCES turnos(id) ON DELETE CASCADE,
  concepto TEXT NOT NULL CHECK (concepto IN ('coseguro','particular')),
  -- Montos
  monto_esperado   NUMERIC(12,2) NOT NULL DEFAULT 0,
  senia_aplicada   NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_cobrado    NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_pendiente  NUMERIC(12,2) GENERATED ALWAYS AS
    (monto_esperado - senia_aplicada - monto_cobrado) STORED,
  -- Pago
  forma_pago TEXT CHECK (forma_pago IN ('efectivo','transferencia','tarjeta','cheque')),
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','cobrado','parcial','eximido')),
  fecha_cobro DATE,
  cobrado_por UUID REFERENCES perfiles(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cobros_turno  ON cobros_paciente(turno_id);
CREATE INDEX idx_cobros_estado ON cobros_paciente(estado);
CREATE INDEX idx_cobros_fecha  ON cobros_paciente(fecha_cobro);

-- ─── LIQUIDACIONES A OS ───────────────────────────────────────────────────────
CREATE TABLE liquidaciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_social_id UUID NOT NULL REFERENCES obras_sociales(id),
  periodo_mes  INTEGER NOT NULL CHECK (periodo_mes BETWEEN 1 AND 12),
  periodo_anio INTEGER NOT NULL,
  total_prestaciones INTEGER DEFAULT 0,
  total_facturado NUMERIC(12,2) DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador','presentada','pagada','con_diferencias','cancelada')),
  fecha_presentacion DATE,
  numero_liquidacion TEXT,   -- número asignado por la OS o interno
  observaciones TEXT,
  creado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(obra_social_id, periodo_mes, periodo_anio)
);
CREATE INDEX idx_liq_os     ON liquidaciones(obra_social_id);
CREATE INDEX idx_liq_estado ON liquidaciones(estado);

-- ─── ÍTEMS DE LIQUIDACIÓN ─────────────────────────────────────────────────────
CREATE TABLE liquidacion_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liquidacion_id UUID NOT NULL REFERENCES liquidaciones(id) ON DELETE CASCADE,
  turno_id UUID NOT NULL REFERENCES turnos(id),
  arancel_aplicado NUMERIC(12,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'incluido'
    CHECK (estado IN ('incluido','debitado','objetado')),
  motivo_debito TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_liq_items_liq   ON liquidacion_items(liquidacion_id);
CREATE INDEX idx_liq_items_turno ON liquidacion_items(turno_id);

-- ─── PAGOS DE OS ──────────────────────────────────────────────────────────────
CREATE TABLE pagos_os (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liquidacion_id UUID NOT NULL REFERENCES liquidaciones(id),
  obra_social_id UUID NOT NULL REFERENCES obras_sociales(id),
  monto_facturado NUMERIC(12,2) NOT NULL,
  monto_pagado    NUMERIC(12,2) NOT NULL,
  diferencia      NUMERIC(12,2) GENERATED ALWAYS AS (monto_facturado - monto_pagado) STORED,
  fecha_pago DATE NOT NULL,
  numero_pago TEXT,
  observaciones TEXT,
  registrado_por UUID REFERENCES perfiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_pagos_os_liq ON pagos_os(liquidacion_id);
CREATE INDEX idx_pagos_os_os  ON pagos_os(obra_social_id);

-- ─── DISTRIBUCIONES CENTRO / PROFESIONAL ─────────────────────────────────────
CREATE TABLE distribuciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  turno_id UUID NOT NULL REFERENCES turnos(id),
  profesional_id UUID NOT NULL REFERENCES profesionales(id),
  origen TEXT NOT NULL CHECK (origen IN ('coseguro','particular','os')),
  monto_total      NUMERIC(12,2) NOT NULL,
  pct_profesional  NUMERIC(5,2)  NOT NULL,
  monto_profesional NUMERIC(12,2) NOT NULL,
  pct_centro       NUMERIC(5,2)  NOT NULL,
  monto_centro     NUMERIC(12,2) NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','liquidado','pagado_al_prof')),
  fecha_liquidacion DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_dist_turno ON distribuciones(turno_id);
CREATE INDEX idx_dist_prof  ON distribuciones(profesional_id);
CREATE INDEX idx_dist_estado ON distribuciones(estado);

-- ─── CATEGORÍAS DE GASTO ─────────────────────────────────────────────────────
CREATE TABLE categorias_gasto (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'variable'
    CHECK (tipo IN ('fijo','variable','extraordinario')),
  color TEXT DEFAULT '#6c757d',   -- para gráficos
  activa BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categorías default
INSERT INTO categorias_gasto (nombre, tipo, color, orden) VALUES
  ('Alquiler',              'fijo',          '#1a2e4a', 1),
  ('Sueldos y honorarios',  'fijo',          '#243c5e', 2),
  ('Servicios (luz/gas/agua)','fijo',        '#e67e22', 3),
  ('Internet y telefonía',  'fijo',          '#f0a45a', 4),
  ('Insumos médicos',       'variable',      '#27ae60', 5),
  ('Material de oficina',   'variable',      '#5dca8a', 6),
  ('Limpieza',              'variable',      '#88aaee', 7),
  ('Mantenimiento',         'variable',      '#c0392b', 8),
  ('Honorarios externos',   'extraordinario','#8b2419', 9),
  ('Equipamiento médico',   'extraordinario','#a85c0f', 10),
  ('Otros',                 'variable',      '#6c757d', 11);

-- ─── GASTOS ───────────────────────────────────────────────────────────────────
CREATE TABLE gastos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  categoria_id UUID NOT NULL REFERENCES categorias_gasto(id),
  concepto TEXT NOT NULL,
  monto NUMERIC(12,2) NOT NULL,
  forma_pago TEXT DEFAULT 'transferencia'
    CHECK (forma_pago IN ('efectivo','transferencia','tarjeta','cheque','debito_automatico')),
  comprobante_nro TEXT,
  estado TEXT NOT NULL DEFAULT 'pagado'
    CHECK (estado IN ('pagado','pendiente','vencido')),
  fecha_vencimiento DATE,
  -- Recurrencia mensual
  es_recurrente    BOOLEAN DEFAULT FALSE,
  recurrencia_dia  INTEGER CHECK (recurrencia_dia BETWEEN 1 AND 31),
  -- Si es recurrente, apunta al gasto "padre" del que se generó
  gasto_padre_id UUID REFERENCES gastos(id),
  registrado_por UUID REFERENCES perfiles(id),
  observaciones TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_gastos_fecha  ON gastos(fecha);
CREATE INDEX idx_gastos_cat    ON gastos(categoria_id);
CREATE INDEX idx_gastos_estado ON gastos(estado);

-- ─── VISTAS ÚTILES ────────────────────────────────────────────────────────────

-- Resumen financiero por mes
CREATE OR REPLACE VIEW v_resumen_mensual AS
SELECT
  DATE_TRUNC('month', fecha_cobro) AS mes,
  SUM(CASE WHEN concepto = 'coseguro'   THEN monto_cobrado ELSE 0 END) AS total_coseguros,
  SUM(CASE WHEN concepto = 'particular' THEN monto_cobrado ELSE 0 END) AS total_particulares,
  COUNT(*) AS total_cobros
FROM cobros_paciente
WHERE estado IN ('cobrado','parcial')
GROUP BY 1 ORDER BY 1 DESC;

-- Cuenta corriente por OS
CREATE OR REPLACE VIEW v_cuenta_corriente_os AS
SELECT
  os.id AS obra_social_id,
  os.nombre AS obra_social,
  COUNT(DISTINCT l.id) AS total_liquidaciones,
  COALESCE(SUM(l.total_facturado), 0) AS total_facturado,
  COALESCE(SUM(p.monto_pagado), 0) AS total_cobrado,
  COALESCE(SUM(l.total_facturado), 0) - COALESCE(SUM(p.monto_pagado), 0) AS saldo_pendiente
FROM obras_sociales os
LEFT JOIN liquidaciones l ON l.obra_social_id = os.id AND l.estado != 'cancelada'
LEFT JOIN pagos_os p ON p.liquidacion_id = l.id
WHERE os.activa = TRUE
GROUP BY os.id, os.nombre
ORDER BY saldo_pendiente DESC;

-- Producción por profesional
CREATE OR REPLACE VIEW v_produccion_profesional AS
SELECT
  pr.id AS profesional_id,
  pr.nombre || ' ' || pr.apellido AS profesional,
  e.nombre AS especialidad,
  COUNT(DISTINCT d.turno_id) AS total_prestaciones,
  COALESCE(SUM(d.monto_total), 0) AS total_generado,
  COALESCE(SUM(d.monto_profesional), 0) AS honorarios_profesional,
  COALESCE(SUM(d.monto_centro), 0) AS ingreso_centro
FROM profesionales pr
LEFT JOIN especialidades e ON e.id = pr.especialidad_id
LEFT JOIN distribuciones d ON d.profesional_id = pr.id
WHERE pr.activo = TRUE
GROUP BY pr.id, pr.nombre, pr.apellido, e.nombre
ORDER BY total_generado DESC;

-- Gastos por categoría del mes actual
CREATE OR REPLACE VIEW v_gastos_mes_actual AS
SELECT
  cg.nombre AS categoria,
  cg.tipo,
  cg.color,
  COUNT(*) AS cantidad,
  SUM(g.monto) AS total
FROM gastos g
JOIN categorias_gasto cg ON cg.id = g.categoria_id
WHERE DATE_TRUNC('month', g.fecha) = DATE_TRUNC('month', CURRENT_DATE)
  AND g.estado != 'vencido'
GROUP BY cg.id, cg.nombre, cg.tipo, cg.color
ORDER BY total DESC;

-- Señas pendientes de aplicar
CREATE OR REPLACE VIEW v_senias_pendientes AS
SELECT
  s.*,
  p.nombre || ' ' || p.apellido AS paciente,
  p.dni AS paciente_dni,
  t.fecha AS turno_fecha,
  t.hora AS turno_hora
FROM senias s
JOIN pacientes p ON p.id = s.paciente_id
LEFT JOIN turnos t ON t.id = s.turno_id
WHERE s.estado = 'cobrada'
ORDER BY s.fecha_cobro;

-- ─── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE acuerdos_profesionales ENABLE ROW LEVEL SECURITY;
ALTER TABLE aranceles ENABLE ROW LEVEL SECURITY;
ALTER TABLE senias ENABLE ROW LEVEL SECURITY;
ALTER TABLE cobros_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE liquidacion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos_os ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias_gasto ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados pueden acceder
-- (en producción agregar chequeo de rol para restringir finanzas a admin)
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'acuerdos_profesionales','aranceles','senias','cobros_paciente',
    'liquidaciones','liquidacion_items','pagos_os','distribuciones',
    'categorias_gasto','gastos'
  ] LOOP
    EXECUTE format('CREATE POLICY "auth_%s" ON %I FOR ALL TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- ─── TRIGGERS updated_at ──────────────────────────────────────────────────────
CREATE TRIGGER trg_aranceles_upd    BEFORE UPDATE ON aranceles    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_cobros_upd       BEFORE UPDATE ON cobros_paciente FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_liquidaciones_upd BEFORE UPDATE ON liquidaciones FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_gastos_upd       BEFORE UPDATE ON gastos        FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── FUNCIÓN: generar cobro automático al marcar turno como atendido ──────────
CREATE OR REPLACE FUNCTION generar_cobro_al_atender()
RETURNS TRIGGER AS $$
DECLARE
  v_arancel aranceles%ROWTYPE;
  v_paciente pacientes%ROWTYPE;
  v_senia_disponible NUMERIC := 0;
  v_concepto TEXT;
BEGIN
  -- Solo cuando cambia a 'atendido'
  IF NEW.estado = 'atendido' AND OLD.estado != 'atendido' THEN
    -- Buscar paciente
    SELECT * INTO v_paciente FROM pacientes WHERE id = NEW.paciente_id;
    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Buscar arancel correspondiente
    SELECT * INTO v_arancel
    FROM aranceles
    WHERE profesional_id = NEW.profesional_id
      AND (obra_social_id = v_paciente.obra_social_id OR
           (obra_social_id IS NULL AND v_paciente.obra_social_id IS NULL))
      AND tipo_turno = NEW.tipo
      AND activo = TRUE
    LIMIT 1;

    IF NOT FOUND THEN RETURN NEW; END IF;

    -- Seña disponible del paciente para este turno
    SELECT COALESCE(SUM(monto), 0) INTO v_senia_disponible
    FROM senias
    WHERE turno_id = NEW.id AND estado = 'cobrada';

    -- Determinar concepto
    v_concepto := CASE WHEN v_paciente.obra_social_id IS NULL THEN 'particular' ELSE 'coseguro' END;

    -- Insertar cobro si no existe ya
    INSERT INTO cobros_paciente (
      turno_id, concepto,
      monto_esperado, senia_aplicada, monto_cobrado,
      estado
    )
    SELECT
      NEW.id, v_concepto,
      CASE v_concepto WHEN 'particular' THEN v_arancel.coseguro ELSE v_arancel.coseguro END,
      v_senia_disponible,
      0,
      CASE WHEN v_senia_disponible > 0 THEN 'parcial' ELSE 'pendiente' END
    WHERE NOT EXISTS (SELECT 1 FROM cobros_paciente WHERE turno_id = NEW.id);

    -- Marcar seña como aplicada
    UPDATE senias SET estado = 'aplicada'
    WHERE turno_id = NEW.id AND estado = 'cobrada';

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generar_cobro
  AFTER UPDATE OF estado ON turnos
  FOR EACH ROW EXECUTE FUNCTION generar_cobro_al_atender();

-- ─── FUNCIÓN: generar gastos recurrentes del mes ─────────────────────────────
-- Llamar manualmente al inicio de cada mes o via cron en Supabase Edge Functions
CREATE OR REPLACE FUNCTION generar_gastos_recurrentes(p_mes INTEGER, p_anio INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_gasto gastos%ROWTYPE;
  v_count INTEGER := 0;
  v_fecha DATE;
BEGIN
  FOR v_gasto IN
    SELECT * FROM gastos
    WHERE es_recurrente = TRUE
      AND gasto_padre_id IS NULL  -- solo los "padres"
      AND estado = 'pagado'
  LOOP
    -- Fecha de vencimiento del nuevo mes
    v_fecha := make_date(p_anio, p_mes,
      LEAST(v_gasto.recurrencia_dia, DATE_PART('day', (make_date(p_anio, p_mes, 1) + INTERVAL '1 month - 1 day'))::INTEGER)
    );

    -- Solo si no existe ya para ese mes
    IF NOT EXISTS (
      SELECT 1 FROM gastos
      WHERE gasto_padre_id = v_gasto.id
        AND DATE_PART('month', fecha_vencimiento) = p_mes
        AND DATE_PART('year', fecha_vencimiento) = p_anio
    ) THEN
      INSERT INTO gastos (
        fecha, categoria_id, concepto, monto, forma_pago,
        estado, fecha_vencimiento, es_recurrente, recurrencia_dia,
        gasto_padre_id, observaciones
      ) VALUES (
        v_fecha, v_gasto.categoria_id,
        v_gasto.concepto, v_gasto.monto, v_gasto.forma_pago,
        'pendiente', v_fecha, FALSE, NULL,
        v_gasto.id, 'Generado automáticamente'
      );
      v_count := v_count + 1;
    END IF;
  END LOOP;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;
