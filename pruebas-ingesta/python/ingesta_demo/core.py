"""Piezas base de la ingesta: especificacion de columnas por area, lectura de
CSV por nombre de cabecera, validacion, conexiones a BD, INSERT (fila a fila
o por lotes), cuarentena, metricas y muestreo de recursos.

Puerto a Python de pruebas-ingesta/java-quarkus/ingesta-demo (IngestaApp.java),
agrupado en un solo modulo para no dispersar la logica en demasiados
archivos pequenos.
"""

import csv
import os
import re
import threading
import time
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from enum import Enum, auto
from pathlib import Path
from typing import Any, Dict, List, Optional

import oracledb
import psutil
import psycopg2


# ============================================================
# Especificacion de columnas por area (AreaSpecs.java)
# ============================================================

class ColumnType(Enum):
    TEXT = auto()
    INT = auto()
    DECIMAL = auto()
    DATE = auto()
    LOAD_TS = auto()  # no viene del CSV: se genera al insertar (fecha_carga)


@dataclass(frozen=True)
class ColumnSpec:
    name: str
    type: ColumnType
    required: bool = True


@dataclass(frozen=True)
class AreaSpec:
    name: str
    motor: str  # "oracle" | "postgresql"
    table: str
    columns: List[ColumnSpec]


def _r(name: str, type_: ColumnType) -> ColumnSpec:
    return ColumnSpec(name, type_, required=True)


def _o(name: str, type_: ColumnType) -> ColumnSpec:
    return ColumnSpec(name, type_, required=False)


AREA1 = AreaSpec(
    name="AREA1",
    motor="oracle",
    table="area1.deudas",
    columns=[
        _o("codigo_interno_area", ColumnType.TEXT),
        _r("nro_documento", ColumnType.TEXT),
        _r("nombre", ColumnType.TEXT),
        _r("num_papeleta", ColumnType.TEXT),
        _r("tipo_documento", ColumnType.TEXT),
        _r("placa_vehiculo", ColumnType.TEXT),
        _o("marca_vehiculo", ColumnType.TEXT),
        _o("modelo_vehiculo", ColumnType.TEXT),
        _r("codigo_infraccion", ColumnType.TEXT),
        _r("calificacion_infraccion", ColumnType.TEXT),
        _r("puntos_infraccion", ColumnType.INT),
        _r("fecha_infraccion", ColumnType.DATE),
        _r("hora_infraccion", ColumnType.TEXT),
        _r("codigo_distrito", ColumnType.TEXT),
        _r("direccion_infraccion", ColumnType.TEXT),
        _r("modalidad_deteccion", ColumnType.TEXT),
        _o("codigo_fiscalizador", ColumnType.TEXT),
        _o("dni_conductor", ColumnType.TEXT),
        _o("numero_licencia", ColumnType.TEXT),
        _r("fecha_emision", ColumnType.DATE),
        _r("fecha_notificacion", ColumnType.DATE),
        _r("medio_notificacion", ColumnType.TEXT),
        _r("fecha_vencimiento", ColumnType.DATE),
        _r("monto_base", ColumnType.DECIMAL),
        _r("porcentaje_descuento", ColumnType.DECIMAL),
        _r("monto_descuento", ColumnType.DECIMAL),
        _r("monto_interes", ColumnType.DECIMAL),
        _r("estado_deuda", ColumnType.TEXT),
        _r("numero_resolucion", ColumnType.TEXT),
        _o("fecha_carga", ColumnType.LOAD_TS),
    ],
)

AREA2 = AreaSpec(
    name="AREA2",
    motor="postgresql",
    table="area2.deudas",
    columns=[
        _r("nro_documento", ColumnType.TEXT),
        _r("nombre", ColumnType.TEXT),
        _r("tipo_documento", ColumnType.TEXT),
        _r("num_papeleta", ColumnType.TEXT),
        _r("placa_vehiculo", ColumnType.TEXT),
        _r("codigo_infraccion", ColumnType.TEXT),
        _r("calificacion_infraccion", ColumnType.TEXT),
        _r("puntos_infraccion", ColumnType.INT),
        _r("fecha_infraccion", ColumnType.DATE),
        _r("hora_infraccion", ColumnType.TEXT),
        _r("codigo_distrito", ColumnType.TEXT),
        _r("direccion_infraccion", ColumnType.TEXT),
        _o("sede", ColumnType.TEXT),
        _r("modalidad_deteccion", ColumnType.TEXT),
        _o("tipo_equipo", ColumnType.TEXT),
        _o("codigo_equipo", ColumnType.TEXT),
        _o("codigo_certificacion", ColumnType.TEXT),
        _o("fecha_certificacion", ColumnType.DATE),
        _r("fecha_emision", ColumnType.DATE),
        _r("fecha_notificacion", ColumnType.DATE),
        _r("medio_notificacion", ColumnType.TEXT),
        _r("fecha_vencimiento", ColumnType.DATE),
        _r("monto_base", ColumnType.DECIMAL),
        _r("porcentaje_descuento", ColumnType.DECIMAL),
        _r("monto_descuento", ColumnType.DECIMAL),
        _r("monto_interes", ColumnType.DECIMAL),
        _r("estado_deuda", ColumnType.TEXT),
        _r("numero_resolucion", ColumnType.TEXT),
        _o("codigo_operador", ColumnType.TEXT),
        _o("fecha_carga", ColumnType.LOAD_TS),
    ],
)


def area_by_name(name: str) -> AreaSpec:
    key = (name or "").strip().upper()
    if key == "AREA1":
        return AREA1
    if key == "AREA2":
        return AREA2
    raise ValueError(f"Area invalida: {name} (use AREA1 o AREA2)")


# ============================================================
# Lectura de CSV por nombre de cabecera (CsvRowReader.java)
# ============================================================

class CsvFormatError(Exception):
    """El CSV no tiene cabecera valida o le faltan columnas requeridas."""


class CsvRowReader:
    """Streaming, columnas mapeadas por NOMBRE (no por posicion).

    Columnas extra propias del area se ignoran; si falta una obligatoria,
    se rechaza el archivo completo antes de leer ninguna fila.
    """

    def __init__(self, path: Path, spec: AreaSpec):
        # utf-8-sig quita el BOM si el archivo lo trae (Excel suele agregarlo).
        self._file = open(path, newline="", encoding="utf-8-sig")
        self._reader = csv.reader(self._file)

        try:
            raw_header = next(self._reader)
        except StopIteration:
            self._file.close()
            raise CsvFormatError("El CSV esta vacio o no tiene cabecera.")

        header = {h.strip().lower(): i for i, h in enumerate(raw_header)}
        self._cols = [c for c in spec.columns if c.type != ColumnType.LOAD_TS]

        self._idx: List[Optional[int]] = []
        faltantes = []
        for c in self._cols:
            pos = header.get(c.name)
            self._idx.append(pos)
            if pos is None and c.required:
                faltantes.append(c.name)

        if faltantes:
            self._file.close()
            raise CsvFormatError(f"El CSV no tiene las columnas requeridas: {faltantes}")

        self._next_row: Optional[List[str]] = None
        self._advance()

    def _advance(self) -> None:
        try:
            self._next_row = next(self._reader)
        except StopIteration:
            self._next_row = None

    def has_next(self) -> bool:
        return self._next_row is not None

    def next(self) -> Dict[str, Optional[str]]:
        """Devuelve la fila actual como {nombre_columna: valor} y avanza."""
        row = self._next_row
        out: Dict[str, Optional[str]] = {}
        for c, idx in zip(self._cols, self._idx):
            value = row[idx] if (idx is not None and idx < len(row)) else None
            if isinstance(value, str):
                value = value.strip() or None
            out[c.name] = value
        self._advance()
        return out

    def close(self) -> None:
        self._file.close()

    def __enter__(self) -> "CsvRowReader":
        return self

    def __exit__(self, exc_type, exc, tb) -> None:
        self.close()


# ============================================================
# Validacion local (RowValidator.java)
# ============================================================

DNI_RE = re.compile(r"\d{8}")


@dataclass
class ValidationResult:
    values: Dict[str, Any]
    error: Optional[str]


class RowValidator:
    """Obligatorias, formato de numeros/fechas y regla de DNI (8 digitos).

    Longitudes y precision exacta (ej. NUMBER(15,2)) se dejan a la BD a
    proposito: si la BD las rechaza, el origen del rechazo se marca "BD",
    no "VALIDACION".
    """

    def __init__(self, spec: AreaSpec):
        self._cols = [c for c in spec.columns if c.type != ColumnType.LOAD_TS]

    def validate(self, raw: Dict[str, Optional[str]]) -> ValidationResult:
        values: Dict[str, Any] = {}
        errors: List[str] = []

        for c in self._cols:
            v = raw.get(c.name)

            if v is None:
                if c.required:
                    errors.append(f"{c.name}: obligatorio")
                values[c.name] = None
                continue

            try:
                if c.type == ColumnType.TEXT:
                    values[c.name] = v
                elif c.type == ColumnType.INT:
                    values[c.name] = int(v)
                elif c.type == ColumnType.DECIMAL:
                    values[c.name] = Decimal(v)
                elif c.type == ColumnType.DATE:
                    values[c.name] = date.fromisoformat(v)
            except (ValueError, InvalidOperation):
                errors.append(f"{c.name}: formato invalido ({v})")
                values[c.name] = None

        tipo_doc = values.get("tipo_documento")
        nro_doc = raw.get("nro_documento")
        if (tipo_doc and str(tipo_doc).upper() == "DNI"
                and nro_doc and not DNI_RE.fullmatch(nro_doc)):
            errors.append(f"nro_documento: DNI debe tener 8 digitos ({nro_doc})")

        return ValidationResult(values, "; ".join(errors) if errors else None)


# ============================================================
# Conexiones a BD (db.py / applyCommitMode de IngestaApp.java)
# ============================================================

ORACLE_DSN = os.environ.get("AREA1_DSN", "localhost:1521/FREEPDB1")
ORACLE_USER = os.environ.get("AREA1_USER", "AREA1")
ORACLE_PASSWORD = os.environ.get("AREA1_PASSWORD", "Area1Poc2024")

PG_HOST = os.environ.get("AREA2_HOST", "localhost")
PG_PORT = int(os.environ.get("AREA2_PORT", "5429"))
PG_DB = os.environ.get("AREA2_DB", "db_area2")
PG_USER = os.environ.get("AREA2_USER", "area2_user")
PG_PASSWORD = os.environ.get("AREA2_PASSWORD", "PgArea2Secure!2024")


def get_connection(spec: AreaSpec):
    """Abre una conexion nueva. Cada hilo de insercion usa la suya."""
    if spec.motor == "oracle":
        # python-oracledb en modo "thin" (puro Python): no requiere Oracle Instant Client.
        return oracledb.connect(user=ORACLE_USER, password=ORACLE_PASSWORD, dsn=ORACLE_DSN)
    return psycopg2.connect(
        host=PG_HOST, port=PG_PORT, dbname=PG_DB, user=PG_USER, password=PG_PASSWORD
    )


def apply_commit_mode(conn, spec: AreaSpec, commit_mode: str) -> None:
    """Se ejecuta en CADA conexion de trabajador: estos ajustes valen solo por sesion."""
    if commit_mode != "nowait":
        return
    cur = conn.cursor()
    try:
        if spec.motor == "oracle":
            cur.execute("ALTER SESSION SET COMMIT_LOGGING = BATCH")
            cur.execute("ALTER SESSION SET COMMIT_WAIT = NOWAIT")
        else:
            cur.execute("SET synchronous_commit = off")
    finally:
        cur.close()


def count_rows(conn, table: str) -> int:
    cur = conn.cursor()
    try:
        cur.execute(f"SELECT COUNT(*) FROM {table}")
        return cur.fetchone()[0]
    finally:
        cur.close()


# ============================================================
# INSERT fila a fila / por lotes (RowInserter.java)
# ============================================================

class RowInserter:
    """oracledb usa binds posicionales ':1, :2, ...'; psycopg2 usa '%s'."""

    def __init__(self, conn, spec: AreaSpec):
        self._spec = spec
        self._cols = spec.columns
        names = ", ".join(c.name for c in self._cols)
        if spec.motor == "oracle":
            marks = ", ".join(f":{i + 1}" for i in range(len(self._cols)))
        else:
            marks = ", ".join("%s" for _ in self._cols)
        self.sql = f"INSERT INTO {spec.table} ({names}) VALUES ({marks})"
        self._cursor = conn.cursor()

    def _bind(self, values: Dict[str, Any], load_ts: datetime) -> List[Any]:
        return [
            load_ts if c.type == ColumnType.LOAD_TS else values.get(c.name)
            for c in self._cols
        ]

    def insert_one(self, values: Dict[str, Any], load_ts: datetime) -> None:
        self._cursor.execute(self.sql, self._bind(values, load_ts))

    def insert_batch(self, values_list: List[Dict[str, Any]], load_ts: datetime) -> None:
        rows = [self._bind(v, load_ts) for v in values_list]
        if self._spec.motor == "postgresql":
            from psycopg2.extras import execute_batch
            execute_batch(self._cursor, self.sql, rows)
        else:
            self._cursor.executemany(self.sql, rows)

    def close(self) -> None:
        self._cursor.close()


# ============================================================
# Cuarentena (QuarantineWriter.java)
# ============================================================

class QuarantineWriter:
    """Un unico CSV de cuarentena por corrida: columnas del area + nro_fila,
    motivo, origen. Compartido entre el lector (rechazos VALIDACION) y los
    hilos de insercion (rechazos BD), por eso lleva su propio lock.
    """

    def __init__(self, path: Path, spec: AreaSpec):
        self._cols = [c for c in spec.columns if c.type != ColumnType.LOAD_TS]
        self._lock = threading.Lock()
        self._file = open(path, "w", newline="", encoding="utf-8")
        self._writer = csv.writer(self._file)
        self._writer.writerow(["nro_fila"] + [c.name for c in self._cols] + ["motivo", "origen"])

    def write(self, row_num: int, raw: Dict[str, Optional[str]], motivo: str, origen: str) -> None:
        with self._lock:
            self._writer.writerow(
                [row_num] + [raw.get(c.name) for c in self._cols] + [motivo, origen]
            )

    def flush(self) -> None:
        with self._lock:
            self._file.flush()

    def close(self) -> None:
        with self._lock:
            self._file.close()


# ============================================================
# Metricas (RunMetrics.java + Histogram, aqui con percentiles simples)
# ============================================================

class LatencyRecorder:
    """Guarda las muestras y ordena para percentiles (alcanza de sobra para
    el volumen de esta prueba; HdrHistogram en Java evita ese costo a
    escalas mucho mayores)."""

    def __init__(self):
        self._values: List[int] = []
        self._lock = threading.Lock()

    def record(self, ns: int) -> None:
        with self._lock:
            self._values.append(ns)

    def merge(self, other: "LatencyRecorder") -> None:
        with self._lock:
            self._values.extend(other._values)

    def percentile(self, p: float) -> float:
        with self._lock:
            if not self._values:
                return 0.0
            s = sorted(self._values)
            k = max(0, min(len(s) - 1, round(p / 100 * (len(s) - 1))))
            return s[k]

    def mean(self) -> float:
        with self._lock:
            return sum(self._values) / len(self._values) if self._values else 0.0

    def max(self) -> float:
        with self._lock:
            return max(self._values) if self._values else 0.0

    def count(self) -> int:
        with self._lock:
            return len(self._values)


@dataclass
class RunMetrics:
    read_ns: int = 0
    validate_ns: int = 0
    insert_ns: int = 0
    quarantine_ns: int = 0

    total: int = 0
    inserted: int = 0
    rejected_local: int = 0
    rejected_db: int = 0

    batches: int = 0
    batch_fallbacks: int = 0

    insert_ok: LatencyRecorder = field(default_factory=LatencyRecorder)
    insert_fail: LatencyRecorder = field(default_factory=LatencyRecorder)
    batch_ok: LatencyRecorder = field(default_factory=LatencyRecorder)

    def record_ok(self, ns: int) -> None:
        self.insert_ns += ns
        self.insert_ok.record(ns)

    def record_fail(self, ns: int) -> None:
        self.insert_ns += ns
        self.insert_fail.record(ns)

    def record_batch_ok(self, ns: int, rows: int) -> None:
        self.insert_ns += ns
        self.inserted += rows
        self.batches += 1
        self.batch_ok.record(ns)

    def record_batch_fail(self, ns: int) -> None:
        self.insert_ns += ns
        self.batches += 1
        self.batch_fallbacks += 1

    def merge(self, other: "RunMetrics") -> None:
        self.read_ns += other.read_ns
        self.validate_ns += other.validate_ns
        self.insert_ns += other.insert_ns
        self.quarantine_ns += other.quarantine_ns
        self.total += other.total
        self.inserted += other.inserted
        self.rejected_local += other.rejected_local
        self.rejected_db += other.rejected_db
        self.batches += other.batches
        self.batch_fallbacks += other.batch_fallbacks
        self.insert_ok.merge(other.insert_ok)
        self.insert_fail.merge(other.insert_fail)
        self.batch_ok.merge(other.batch_ok)


class ProgressCounter:
    """Contador atomico compartido entre hilos (equivalente a AtomicLong)."""

    def __init__(self):
        self._value = 0
        self._lock = threading.Lock()

    def add(self, k: int) -> int:
        with self._lock:
            self._value += k
            return self._value


class LatencyWriter:
    """latencias.csv: una fila por INSERT (o por lote, con la fila representante)."""

    def __init__(self, path: Path):
        self._lock = threading.Lock()
        self._file = open(path, "w", encoding="utf-8")
        self._file.write("nro_fila,ok,ns\n")

    def write(self, row_num: int, ok: int, ns: int) -> None:
        with self._lock:
            self._file.write(f"{row_num},{ok},{ns}\n")

    def close(self) -> None:
        with self._lock:
            self._file.close()


# ============================================================
# Recursos del proceso (JvmSampler.java, aqui con psutil)
# ============================================================

class ResourceSampler(threading.Thread):
    """Muestrea CPU y memoria (RSS) del proceso cada 1 s hacia recursos.csv.

    Equivalente ligero del JvmSampler (heap/GC/CPU de la JVM); en Python no
    hay heap/GC comparables, asi que se reporta CPU% y memoria del proceso.
    """

    def __init__(self, path: Path):
        super().__init__(name="resource-sampler", daemon=True)
        self._path = path
        self._process = psutil.Process()
        self._running = True
        self._peak_rss = 0

    def peak_rss_bytes(self) -> int:
        return self._peak_rss

    def run(self) -> None:
        t0 = time.time()
        self._process.cpu_percent(interval=None)  # primera llamada "calibra", se descarta
        with open(self._path, "w", encoding="utf-8") as f:
            f.write("t_ms,rss_mb,cpu_proceso_pct\n")
            while self._running:
                self._sample(f, t0)
                time.sleep(1)
            self._sample(f, t0)

    def _sample(self, f, t0: float) -> None:
        rss = self._process.memory_info().rss
        if rss > self._peak_rss:
            self._peak_rss = rss
        cpu = self._process.cpu_percent(interval=None)
        f.write(f"{int((time.time() - t0) * 1000)},{rss / 1048576:.1f},{cpu:.1f}\n")
        f.flush()

    def stop(self) -> None:
        self._running = False
        self.join(timeout=2)
