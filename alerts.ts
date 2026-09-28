import type { Alert } from "./types";
import type { TwinState } from "./store";
import { bottleneckScores, cycleStats, defectGroups, mean, std } from "./analytics";

export const LIMITS = {
  bottleneckWarn: 0.6,
  bottleneckCrit: 0.8,
  zScore: 2,
  tempC: 65,
  vibration: 6,
  clusterFactor: 2,
  clusterMinSample: 5,
} as const;

export type AlertType = "BOTTLENECK" | "CYCLE_TIME_DEVIATION" | "SENSOR_THRESHOLD" | "QUALITY_CLUSTER" | "MACHINE_DOWN";

const p = (n: number) => `${(n * 100).toFixed(0)}%`;

/** Rule-based alert derivation. Every alert carries the numbers that triggered it. */
export function deriveAlerts(s: TwinState): Alert[] {
  const alerts: Alert[] = [];

  // 5. Machine down
  for (const a of Object.values(s.assets)) {
    if (a.station_id.endsWith("STORE") || a.status !== "DOWN") continue;
    const st = s.stations[a.station_id];
    alerts.push({
      alert_id: `AL-DOWN-${a.asset_id}`, severity: "CRITICAL", type: "MACHINE_DOWN", entity_id: `${a.station_id} / ${a.asset_id}`,
      title: `${a.station_id} is down`,
      evidence: [`Asset ${a.asset_id} status = DOWN`, `Health ${a.health.toFixed(0)}%`, `Queue waiting: ${st.queue.length} parts`, `Rule: asset status is DOWN`],
    });
  }

  // 1. Bottleneck score
  for (const b of bottleneckScores(s)) {
    if (b.score <= LIMITS.bottleneckWarn) continue;
    alerts.push({
      alert_id: `AL-BN-${b.station}`, severity: b.score > LIMITS.bottleneckCrit ? "CRITICAL" : "WARNING", type: "BOTTLENECK", entity_id: b.station,
      title: `${b.station} bottleneck score ${b.score.toFixed(2)}`,
      evidence: [
        `Queue ${b.raw.queue} now (avg ${b.raw.avgQueue.toFixed(1)}) vs line baseline ${b.raw.lineQueue.toFixed(1)}`,
        `Utilization ${p(b.raw.util)}`,
        `Cycle time ${b.raw.avgCt}s, ${b.raw.ctDevPct >= 0 ? "+" : ""}${b.raw.ctDevPct.toFixed(0)}% vs line mean ${b.raw.lineCt.toFixed(0)}s`,
        `Carries ${p(b.raw.flowShare)} of released products`,
        `Rule: score > ${LIMITS.bottleneckWarn} (critical > ${LIMITS.bottleneckCrit})`,
      ],
    });
  }

  // 2. Cycle-time deviation: latest completions vs the station's own baseline
  for (const c of cycleStats(s)) {
    if (c.n < 15) continue;
    const base = c.samples.slice(0, -3);
    const m = mean(base), sd = std(base) || 1;
    const recent = c.samples.slice(-3);
    const worst = recent.reduce((w, x) => (Math.abs(x - m) > Math.abs(w - m) ? x : w), recent[0]!);
    const z = (worst - m) / sd;
    if (Math.abs(z) <= LIMITS.zScore) continue;
    alerts.push({
      alert_id: `AL-CT-${c.station}`, severity: Math.abs(z) > 3 ? "CRITICAL" : "WARNING", type: "CYCLE_TIME_DEVIATION", entity_id: c.station,
      title: `${c.station} cycle time ${z > 0 ? "above" : "below"} baseline (z = ${z.toFixed(1)})`,
      evidence: [`Recent cycle ${worst}s vs baseline mean ${m.toFixed(0)}s (σ ${sd.toFixed(1)}s)`, `Deviation ${(((worst - m) / m) * 100).toFixed(0)}%`, `Baseline from ${base.length} completions`, `Rule: |z| > ${LIMITS.zScore}`],
    });
  }

  // 3. Sensor thresholds
  for (const a of Object.values(s.assets)) {
    if (a.station_id.endsWith("STORE")) continue;
    const hot = a.temperature > LIMITS.tempC, shaky = a.vibration > LIMITS.vibration;
    if (!hot && !shaky) continue;
    alerts.push({
      alert_id: `AL-SENS-${a.asset_id}`, severity: hot && shaky ? "CRITICAL" : "WARNING", type: "SENSOR_THRESHOLD", entity_id: `${a.station_id} / ${a.asset_id}`,
      title: `${a.asset_id} sensor ${[hot && "temperature", shaky && "vibration"].filter(Boolean).join(" + ")} over limit`,
      evidence: [
        `Temperature ${a.temperature.toFixed(1)}°C (limit ${LIMITS.tempC}°C)${hot ? " — over" : ""}`,
        `Vibration ${a.vibration.toFixed(2)} mm/s (limit ${LIMITS.vibration} mm/s)${shaky ? " — over" : ""}`,
        `Rule: temperature > ${LIMITS.tempC}°C or vibration > ${LIMITS.vibration} mm/s`,
      ],
    });
  }

  // 4. Quality clusters by machine and batch
  const dg = defectGroups(s);
  for (const [dim, rows] of [["machine", dg.byMachine], ["batch", dg.byBatch]] as const) {
    for (const r of rows) {
      if (r.n < LIMITS.clusterMinSample || r.rate <= dg.plant * LIMITS.clusterFactor) continue;
      alerts.push({
        alert_id: `AL-QC-${r.key}`, severity: r.rate > dg.plant * 3 ? "CRITICAL" : "WARNING", type: "QUALITY_CLUSTER", entity_id: r.key,
        title: `Quality cluster on ${dim} ${r.key}`,
        evidence: [
          `${r.f} of ${r.n} inspected failed (${p(r.rate)})`,
          `Plant average ${p(dg.plant)} → ${(r.rate / (dg.plant || 1)).toFixed(1)}× average`,
          `Most common defect: ${r.top}`,
          `Rule: failure rate > ${LIMITS.clusterFactor}× plant average, sample ≥ ${LIMITS.clusterMinSample}`,
        ],
      });
    }
  }

  const rank = { CRITICAL: 0, WARNING: 1, INFO: 2 };
  return alerts.sort((a, b) => rank[a.severity] - rank[b.severity]);
}
