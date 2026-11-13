"""CLI de ingesta CSV -> BD (Oracle AREA1 / PostgreSQL AREA2) con metricas.

Puerto a Python del prototipo Java (pruebas-ingesta/java-quarkus/ingesta-demo):
mismo pipeline lector -> cola -> N hilos de insercion, mismos modos de
commit (normal | nowait) y de insercion (fila a fila | lotes).

Uso:
    python -m ingesta_demo.main --csv data/BD_Area1.csv --area AREA1 --latencias
"""

import argparse
import json
import os
import queue
import shlex
import sys
import threading
import time
from datetime import datetime
from pathlib import Path

from . import core

POISON = object()


# ============================================================
# Hilo de insercion (InsertWorker.java)
# ============================================================

class InsertWorker(threading.Thread):
    """Su propia conexion y su propio RowInserter.

    batch_size=1 -> fila a fila con autocommit. batch_size>1 -> acumula,
    inserta el lote con un solo commit; si el lote falla, rollback y
    reintento 1 a 1 SOLO de esas filas.
    """

    def __init__(self, name, spec, commit_mode, job_queue, load_ts, quarantine,
                 lat_writer, progress, progress_every, log, ready_event, batch_size):
        super().__init__(name=name, daemon=True)
        self.spec = spec
        self.commit_mode = commit_mode
        self.queue = job_queue
        self.load_ts = load_ts
        self.quarantine = quarantine
        self.lat_writer = lat_writer
        self.progress = progress
        self.progress_every = progress_every
        self.log = log
        self.ready_event = ready_event
        self.batch_size = batch_size

        self.metrics = core.RunMetrics()
        self.failure = None

    def run(self) -> None:
        conn = None
        try:
            conn = core.get_connection(self.spec)
            conn.autocommit = self.batch_size <= 1  # lotes: commit manual
            core.apply_commit_mode(conn, self.spec, self.commit_mode)
            inserter = core.RowInserter(conn, self.spec)
            try:
                self.ready_event.set()
                if self.batch_size <= 1:
                    self._run_row_by_row(inserter)
                else:
                    self._run_batches(conn, inserter)
            finally:
                inserter.close()
        except BaseException as e:  # se reporta al hilo principal, no se pierde
            self.failure = e
            self.ready_event.set()
        finally:
            if conn is not None:
                conn.close()

    def _run_row_by_row(self, inserter) -> None:
        while True:
            job = self.queue.get()
            if job is POISON:
                break
            self._insert_one(inserter, None, job)
            self._progress(1)

    def _run_batches(self, conn, inserter) -> None:
        batch = []
        end = False
        while not end:
            job = self.queue.get()
            if job is POISON:
                end = True
            else:
                batch.append(job)
            if batch and (len(batch) >= self.batch_size or end):
                self._flush_batch(conn, inserter, batch)
                self._progress(len(batch))
                batch.clear()

    def _flush_batch(self, conn, inserter, batch) -> None:
        t = time.perf_counter_ns()
        try:
            inserter.insert_batch([values for _, _, values in batch], self.load_ts)
            conn.commit()
            ns = time.perf_counter_ns() - t
            self.metrics.record_batch_ok(ns, len(batch))
            self._write_lat(batch[0][0], 1, ns)
        except Exception:
            self.metrics.record_batch_fail(time.perf_counter_ns() - t)
            conn.rollback()
            for job in batch:  # 1 a 1: las filas malas van a cuarentena, las buenas se insertan
                self._insert_one(inserter, conn, job)

    def _insert_one(self, inserter, conn, job) -> None:
        row_num, raw, values = job
        t = time.perf_counter_ns()
        try:
            inserter.insert_one(values, self.load_ts)
            if conn is not None:
                conn.commit()
            ns = time.perf_counter_ns() - t
            self.metrics.record_ok(ns)
            self.metrics.inserted += 1
            self._write_lat(row_num, 1, ns)
        except Exception as e:
            if conn is not None:
                conn.rollback()
            ns = time.perf_counter_ns() - t
            self.metrics.record_fail(ns)
            self.metrics.rejected_db += 1
            self._write_lat(row_num, 0, ns)
            primera_linea = str(e).splitlines()[0] if str(e) else ""
            motivo = f"{type(e).__name__}: {primera_linea}"
            t2 = time.perf_counter_ns()
            self.quarantine.write(row_num, raw, motivo, "BD")
            self.metrics.quarantine_ns += time.perf_counter_ns() - t2

    def _progress(self, k: int) -> None:
        after = self.progress.add(k)
        before = after - k
        if self.progress_every > 0 and before // self.progress_every != after // self.progress_every:
            self.log(f"Progreso: {after} filas procesadas por la BD")

    def _write_lat(self, row_num: int, ok: int, ns: int) -> None:
        if self.lat_writer is not None:
            self.lat_writer.write(row_num, ok, ns)


# ============================================================
# Log y reportes (RunLog.java / ReportWriter.java)
# ============================================================

class RunLog:
    """Log simple: consola + run.log."""

    def __init__(self, path: Path):
        self._file = open(path, "w", encoding="utf-8")

    def __call__(self, msg: str) -> None:
        line = f"{datetime.now().strftime('%H:%M:%S.%f')[:-3]}  {msg}"
        print(line)
        self._file.write(line + "\n")
        self._file.flush()

    def close(self) -> None:
        self._file.close()


def _fmt_csv(v):
    return f"{v:.3f}" if isinstance(v, float) else v


def write_reports(out_dir: Path, run_dir: Path, run_id: str, d: dict) -> None:
    """resumen.json + resultados.csv (acumulativo) + reporte_metricas_python.md (acumulativo)."""
    import csv as csv_mod

    (run_dir / "resumen.json").write_text(
        json.dumps(d, indent=2, ensure_ascii=False, default=str), encoding="utf-8"
    )

    csv_path = out_dir / "resultados.csv"
    nuevo = not csv_path.exists()
    with open(csv_path, "a", newline="", encoding="utf-8") as f:
        writer = csv_mod.writer(f)
        if nuevo:
            writer.writerow(list(d.keys()))
        writer.writerow([_fmt_csv(v) for v in d.values()])

    _append_markdown_report(out_dir, run_id, d)


def _append_markdown_report(out_dir: Path, run_id: str, d: dict) -> None:
    """Agrega una seccion por corrida a reporte_metricas_python.md (una por area,
    igual espiritu que reporte_metricas_quarkus.md: una tabla de resultados que
    luego se puede completar a mano con la interpretacion de cada corrida."""
    md_path = out_dir / f"reporte_metricas_python_{d['area'].lower()}.md"
    nuevo = not md_path.exists()

    comando = " ".join(shlex.quote(a) for a in sys.argv)
    ok_txt = "OK" if d["conteo_ok"] else "DISCREPANCIA"

    bloque = []
    if nuevo:
        bloque.append(f"# Reporte de metricas de ingesta (Python) — {d['area']} ({d['motor']})\n")
        bloque.append(
            "> Generado automaticamente por `ingesta_demo.main` al terminar cada corrida. "
            "Agregar debajo de cada tabla la interpretacion correspondiente, igual que en "
            "`reporte_metricas_quarkus.md`.\n"
        )

    bloque.append(f"## Corrida `{run_id}`\n")
    bloque.append(f"```\n{comando}\n```\n")
    bloque.append("| Parametro | Valor |")
    bloque.append("|---|---|")
    bloque.append(f"| CSV | `{d['csv']}` ({d['csv_mb']:.1f} MB) |")
    bloque.append(f"| Filas (max-rows) | {d['max_rows'] or 'todas'} |")
    bloque.append(f"| Hilos | {d['threads']} |")
    bloque.append(f"| Modo de commit | {d['commit_mode']} |")
    bloque.append(f"| Tamano de lote | {d['batch_size']} |")
    bloque.append("")
    bloque.append("| Metrica | Valor |")
    bloque.append("|---|---|")
    bloque.append(f"| Filas totales leidas | {d['total_filas']} |")
    bloque.append(f"| Insertadas | {d['insertadas']} |")
    bloque.append(f"| Rechazadas (validacion) | {d['rechazadas_validacion']} |")
    bloque.append(f"| Rechazadas (BD) | {d['rechazadas_bd']} |")
    bloque.append(f"| Tiempo total (reloj) | {d['t_total_ms'] / 1000:.2f} s |")
    bloque.append(f"| Throughput insertadas | {d['filas_seg_insert']:.0f} filas/s |")
    bloque.append(
        f"| Latencia INSERT p50 / p95 / p99 / max (us) | "
        f"{d['lat_insert_p50_us']:.0f} / {d['lat_insert_p95_us']:.0f} / "
        f"{d['lat_insert_p99_us']:.0f} / {d['lat_insert_max_us']:.0f} |"
    )
    if d["batch_size"] > 1:
        bloque.append(f"| Lotes (total / con fallback) | {d['lotes_total']} / {d['lotes_con_fallback']} |")
        bloque.append(
            f"| Latencia lote p50 / p95 / p99 (us) | "
            f"{d['lat_lote_p50_us']:.0f} / {d['lat_lote_p95_us']:.0f} / {d['lat_lote_p99_us']:.0f} |"
        )
    bloque.append(f"| RSS pico del proceso | {d['rss_pico_mb']:.0f} MB |")
    bloque.append(f"| Verificacion COUNT(*) | antes={d['count_bd_antes']} despues={d['count_bd_despues']} -> **{ok_txt}** |")
    bloque.append("\n**Interpretacion:** _(completar)_\n")
    bloque.append("---\n")

    with open(md_path, "a", encoding="utf-8") as f:
        f.write("\n".join(bloque) + "\n")


# ============================================================
# CLI y orquestacion (IngestaApp.call())
# ============================================================

def parse_args(argv=None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        prog="ingesta",
        description="Ingesta CSV -> BD (fila a fila o por lotes, con metricas).",
    )
    p.add_argument("--csv", required=True, type=Path, help="Ruta del CSV")
    p.add_argument("--area", required=True, help="AREA1 (Oracle) o AREA2 (PostgreSQL)")
    p.add_argument("--run-id", default=None, help="Identificador de la corrida")
    p.add_argument("--out", default=Path("out"), type=Path, help="Carpeta de salida")
    p.add_argument("--max-rows", type=int, default=0, help="Limita filas leidas (0 = todas)")
    p.add_argument("--latencias", action="store_true", help="Guarda latencia de cada INSERT/lote")
    p.add_argument("--progress-every", type=int, default=50_000)
    p.add_argument("--commit-mode", default="normal", choices=["normal", "nowait"])
    p.add_argument("--threads", type=int, default=1, help="Hilos de insercion (cada uno con su conexion)")
    p.add_argument("--queue-size", type=int, default=10_000, help="Tamano de la cola lector -> hilos")
    p.add_argument("--batch-size", type=int, default=1, help="Filas por lote (1 = fila a fila con autocommit)")
    return p.parse_args(argv)


def _enqueue(job_queue: "queue.Queue", job, workers) -> None:
    """Pone un trabajo en la cola; si un trabajador murio, aborta en vez de bloquear para siempre."""
    while True:
        try:
            job_queue.put(job, timeout=0.5)
            return
        except queue.Full:
            for w in workers:
                if w.failure is not None:
                    raise RuntimeError(f"Fallo en {w.name}") from w.failure


def run(args: argparse.Namespace) -> int:
    if args.threads < 1:
        raise SystemExit("--threads debe ser >= 1")
    if args.batch_size < 1:
        raise SystemExit("--batch-size debe ser >= 1")

    spec = core.area_by_name(args.area)
    run_id = args.run_id or f"{spec.name.lower()}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    run_dir = args.out / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    file_bytes = args.csv.stat().st_size

    log = RunLog(run_dir / "run.log")
    main_conn = None
    quarantine = None
    lat_writer = None
    sampler = None
    try:
        log(
            f"Inicio corrida {run_id} | area={spec.name} motor={spec.motor} hilos={args.threads} "
            f"commit={args.commit_mode} csv={args.csv} ({file_bytes / 1048576:.1f} MB)"
        )

        # Conexion principal: solo para los COUNT(*) de antes y despues.
        main_conn = core.get_connection(spec)
        count_before = core.count_rows(main_conn, spec.table)
        load_ts = datetime.now().replace(microsecond=0)

        metrics = core.RunMetrics()
        validator = core.RowValidator(spec)
        job_queue: "queue.Queue" = queue.Queue(maxsize=args.queue_size)

        quarantine = core.QuarantineWriter(run_dir / "cuarentena.csv", spec)
        lat_writer = core.LatencyWriter(run_dir / "latencias.csv") if args.latencias else None

        if args.commit_mode == "nowait":
            log("Modo de commit: NOWAIT en cada sesion de trabajador")

        sampler = core.ResourceSampler(run_dir / "recursos.csv")
        sampler.start()

        processed = core.ProgressCounter()
        ready_events = [threading.Event() for _ in range(args.threads)]
        workers = []

        t0 = time.perf_counter_ns()
        for i in range(args.threads):
            w = InsertWorker(
                name=f"worker-{i + 1}", spec=spec, commit_mode=args.commit_mode,
                job_queue=job_queue, load_ts=load_ts, quarantine=quarantine,
                lat_writer=lat_writer, progress=processed, progress_every=args.progress_every,
                log=log, ready_event=ready_events[i], batch_size=args.batch_size,
            )
            workers.append(w)
            w.start()

        for e in ready_events:
            e.wait()
        conn_ns = time.perf_counter_ns() - t0
        for w in workers:
            if w.failure is not None:
                raise RuntimeError(f"No se pudo iniciar {w.name}") from w.failure
        log(f"{args.threads} conexiones establecidas en {conn_ns / 1e6:.1f} ms")

        # ---- Hilo principal: lee, valida y reparte ----
        t_start = time.perf_counter_ns()
        row_num = 0
        try:
            with core.CsvRowReader(args.csv, spec) as reader:
                while True:
                    t = time.perf_counter_ns()
                    has = reader.has_next()
                    raw = reader.next() if has else None
                    metrics.read_ns += time.perf_counter_ns() - t
                    if not has:
                        break
                    row_num += 1
                    metrics.total += 1

                    t = time.perf_counter_ns()
                    result = validator.validate(raw)
                    metrics.validate_ns += time.perf_counter_ns() - t

                    if result.error:
                        metrics.rejected_local += 1
                        t = time.perf_counter_ns()
                        quarantine.write(row_num, raw, result.error, "VALIDACION")
                        metrics.quarantine_ns += time.perf_counter_ns() - t
                    else:
                        _enqueue(job_queue, (row_num, raw, result.values), workers)

                    if args.max_rows and row_num >= args.max_rows:
                        break
        except core.CsvFormatError as e:
            log(f"ERROR: {e}")
            return 1

        # ---- Fin: una senal por trabajador y esperar a que terminen ----
        for _ in range(args.threads):
            _enqueue(job_queue, POISON, workers)
        for w in workers:
            w.join()
        for w in workers:
            if w.failure is not None:
                raise RuntimeError(f"Fallo en {w.name}") from w.failure

        t_q = time.perf_counter_ns()
        quarantine.flush()
        metrics.quarantine_ns += time.perf_counter_ns() - t_q
        total_ns = time.perf_counter_ns() - t_start

        for w in workers:
            metrics.merge(w.metrics)

        sampler.stop()

        # ---- Verificacion de correccion ----
        count_after = core.count_rows(main_conn, spec.table)
        delta = count_after - count_before
        ok = (
            delta == metrics.inserted
            and metrics.total == metrics.inserted + metrics.rejected_local + metrics.rejected_db
        )

        total_s = total_ns / 1e9
        d = {
            "run_id": run_id,
            "area": spec.name,
            "motor": spec.motor,
            "csv": str(args.csv),
            "csv_mb": file_bytes / 1048576.0,
            "max_rows": args.max_rows,
            "fecha_carga": load_ts.isoformat(),
            "commit_mode": args.commit_mode,
            "threads": args.threads,
            "queue_size": args.queue_size,
            "total_filas": metrics.total,
            "insertadas": metrics.inserted,
            "rechazadas_validacion": metrics.rejected_local,
            "rechazadas_bd": metrics.rejected_db,
            "pct_rechazo": 0.0 if metrics.total == 0 else 100.0 * (metrics.rejected_local + metrics.rejected_db) / metrics.total,
            "t_conexion_ms": conn_ns / 1e6,
            "t_total_ms": total_ns / 1e6,
            "t_lectura_ms": metrics.read_ns / 1e6,
            "t_validacion_ms": metrics.validate_ns / 1e6,
            "t_insert_acum_ms": metrics.insert_ns / 1e6,
            "t_cuarentena_acum_ms": metrics.quarantine_ns / 1e6,
            "filas_seg_total": 0.0 if total_s == 0 else metrics.total / total_s,
            "filas_seg_insert": 0.0 if total_s == 0 else metrics.inserted / total_s,
            "mb_seg": 0.0 if total_s == 0 else (file_bytes / 1048576.0) / total_s,
            "lat_insert_media_us": metrics.insert_ok.mean() / 1000.0,
            "lat_insert_p50_us": metrics.insert_ok.percentile(50) / 1000.0,
            "lat_insert_p95_us": metrics.insert_ok.percentile(95) / 1000.0,
            "lat_insert_p99_us": metrics.insert_ok.percentile(99) / 1000.0,
            "lat_insert_max_us": metrics.insert_ok.max() / 1000.0,
            "lat_error_bd_media_us": metrics.insert_fail.mean() / 1000.0,
            "lat_error_bd_p95_us": metrics.insert_fail.percentile(95) / 1000.0,
            "rss_pico_mb": sampler.peak_rss_bytes() / 1048576.0,
            "count_bd_antes": count_before,
            "count_bd_despues": count_after,
            "conteo_ok": ok,
            "python": sys.version.split()[0],
            "cpus": os.cpu_count() or 1,
            "batch_size": args.batch_size,
            "lotes_total": metrics.batches,
            "lotes_con_fallback": metrics.batch_fallbacks,
            "lat_lote_p50_us": metrics.batch_ok.percentile(50) / 1000.0,
            "lat_lote_p95_us": metrics.batch_ok.percentile(95) / 1000.0,
            "lat_lote_p99_us": metrics.batch_ok.percentile(99) / 1000.0,
            "lat_lote_max_us": metrics.batch_ok.max() / 1000.0,
        }
        write_reports(args.out, run_dir, run_id, d)

        log("---- RESUMEN ----")
        log(
            f"Filas: total={metrics.total} insertadas={metrics.inserted} "
            f"rech.validacion={metrics.rejected_local} rech.bd={metrics.rejected_db}"
        )
        log(
            f"Tiempo total (reloj): {total_s:.2f} s | lectura={metrics.read_ns / 1e6:.0f} ms "
            f"validacion={metrics.validate_ns / 1e6:.0f} ms | "
            f"insert acumulado (suma de hilos)={metrics.insert_ns / 1e6:.0f} ms | "
            f"cuarentena acumulada={metrics.quarantine_ns / 1e6:.0f} ms"
        )
        log(
            f"Throughput: {(0 if total_s == 0 else metrics.total / total_s):.0f} filas/s total | "
            f"{(0 if total_s == 0 else metrics.inserted / total_s):.0f} filas/s insertadas | "
            f"hilos={args.threads}"
        )
        log(
            f"Latencia INSERT (us): p50={metrics.insert_ok.percentile(50) / 1000.0:.0f} "
            f"p95={metrics.insert_ok.percentile(95) / 1000.0:.0f} "
            f"p99={metrics.insert_ok.percentile(99) / 1000.0:.0f} "
            f"max={metrics.insert_ok.max() / 1000.0:.0f}"
        )
        log(
            f"Lotes: tamano={args.batch_size} total={metrics.batches} con_fallback={metrics.batch_fallbacks} | "
            f"latencia lote (us): p50={metrics.batch_ok.percentile(50) / 1000.0:.0f} "
            f"p95={metrics.batch_ok.percentile(95) / 1000.0:.0f} "
            f"p99={metrics.batch_ok.percentile(99) / 1000.0:.0f}"
        )
        log(f"Proceso: RSS pico={sampler.peak_rss_bytes() / 1048576.0:.0f} MB")
        log(
            f"Verificacion COUNT(*): antes={count_before} despues={count_after} -> "
            f"{'OK' if ok else 'DISCREPANCIA'}"
        )
        return 0 if ok else 2
    finally:
        if sampler is not None:
            sampler.stop()
        if main_conn is not None:
            main_conn.close()
        if quarantine is not None:
            quarantine.close()
        if lat_writer is not None:
            lat_writer.close()
        log.close()


def main(argv=None) -> int:
    args = parse_args(argv)
    return run(args)


if __name__ == "__main__":
    sys.exit(main())
