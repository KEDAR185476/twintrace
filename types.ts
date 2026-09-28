export type StationId =
  | "RM-STORE"
  | "CNC-01"
  | "CNC-02"
  | "CNC-03"
  | "ASSEMBLY-01"
  | "QUALITY-01"
  | "FG-STORE";

export type StationType = "STORE" | "CNC" | "ASSEMBLY" | "QUALITY";
export type AssetStatus = "RUNNING" | "IDLE" | "DOWN";
export type ProductStatus = "QUEUED" | "IN_PROCESS" | "IN_TRANSIT" | "COMPLETED" | "REJECTED";
export type QualityState = "PENDING" | "PASS" | "FAIL";

export interface Product {
  product_id: string;
  tag_id: string;
  batch_id: string;
  order_id: string;
  status: ProductStatus;
  current_station: StationId;
  quality_state: QualityState;
}

export interface MaterialBatch {
  batch_id: string;
  supplier_lot: string;
  quantity: number;
  specification: string;
}

export interface Station {
  station_id: StationId;
  type: StationType;
  capacity: number;
  status: AssetStatus;
  queue: string[];
  current_product: string | null;
}

export interface Asset {
  asset_id: string;
  station_id: StationId;
  utilization: number; // 0..1
  health: number; // 0..100
  status: AssetStatus;
  temperature: number; // °C
  vibration: number; // mm/s
}

export type EventType =
  | "TAG_SCAN"
  | "PROCESS_START"
  | "PROCESS_COMPLETE"
  | "QUALITY_PASS"
  | "QUALITY_FAIL"
  | "MACHINE_DOWN"
  | "MACHINE_RECOVERED"
  | "MATERIAL_MOVE";

export interface ProcessEvent {
  event_id: string;
  event_type: EventType;
  timestamp: number; // epoch ms
  product_id?: string;
  station_id: StationId;
  asset_id?: string;
  operation?: string;
  cycle_time_sec?: number;
  batch_id?: string;
  to_station?: StationId;
  defect_type?: string;
}

export interface QualityRecord {
  inspection_id: string;
  product_id: string;
  result: "PASS" | "FAIL";
  defect_type: string | null;
  station_id: StationId;
  asset_id: string; // upstream CNC asset that machined the part
  batch_id: string;
  timestamp: number;
}

export interface Route {
  route_id: string;
  from_station: StationId;
  to_station: StationId;
  travel_time_sec: number;
}

export interface Scenario {
  scenario_id: string;
  change: string;
  assumptions: string[];
  outputs: Record<string, number | string>;
}

export type Severity = "INFO" | "WARNING" | "CRITICAL";

export interface Alert {
  alert_id: string;
  severity: Severity;
  type: string;
  entity_id: string;
  title: string;
  evidence: string[];
}
