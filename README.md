L&T TECHGIUM – INTERNAL HACKATHON 2026
PROBLEM STATEMENT #29
TWINTRACE AI
Product-Centric Factory Digital Twin for Traceability, Material Flow & Manufacturing Intelligence
A competition-ready proof of concept connecting physical product identity, manufacturing events, factory context, quality information, analytics and what-if decision support.
Item	Details
Challenge	L&T Techgium – Internal Hackathon 2026
Problem	#29 – Enterprise Digital Twin of Factory
Solution	TwinTrace AI
Focus	Product-centric factory digital twin with material-flow traceability
Foundation	TapTrace AI – NFC-enabled product traceability concept
POC boundary	One defined manufacturing flow / asset group / material-flow scenario
Users	Production, quality, operations/maintenance and plant decision makers
Core value	Know what is happening, understand why, trace what happened, and evaluate what to do next.

CONFIDENTIAL – HACKATHON PROJECT DOCUMENT
 
1. Executive Summary
L&T Techgium Problem Statement #29 asks teams to design and demonstrate an innovative proof of concept for a factory digital twin around a defined manufacturing need. The challenge permits a process, production area, asset group, material flow, utility system or operational decision as the focus, and expects a meaningful relationship between the factory context and its virtual representation, a mechanism for keeping the twin current, and useful insight or alternative evaluation.
TwinTrace AI addresses this through a product-centric factory digital twin. Each physical product receives a unique digital identity using NFC/QR. Manufacturing events update the product and factory state. The resulting digital thread connects material, process, machine, quality and movement history. Analytics identify bottlenecks and anomalies, while bounded simulation lets users evaluate alternatives such as machine downtime or workload redistribution.
The critical positioning is: NFC is not the digital twin. NFC is the physical-to-digital identity bridge inside a broader twin. The complete concept is Manufacturing → Product Identity → Process Events → Material Flow → Quality → Digital Twin State → Analytics → Decision Support.
1.1 One-Line Pitch
TwinTrace AI is a product-centric factory digital twin that turns physical product movements and manufacturing events into a continuously updated digital thread, then uses analytics and simulation to help factory teams trace problems, detect bottlenecks and evaluate alternative decisions.
1.2 Winning Message
The twin does not just tell the operator what happened. It connects the physical product and factory state to explain what is happening now and evaluate what should happen next.
2. Original Problem Statement – L&T Techgium #29
Design and demonstrate an innovative proof of concept for a factory digital twin that addresses a defined manufacturing need. Teams may select an appropriate process, production area, asset group, material flow, utility system, or operational decision as the focus. The solution should establish a meaningful relationship between the factory context and its virtual representation, keep the twin current and clearly demonstrate how users gain insight or evaluate alternatives. Teams may choose the modeling approach, software, analytics, visualization, simulation, artificial intelligence, and interaction model. The POC should explain its assumptions, boundaries, data requirements, intended users, and measurable success criteria. It should show how the concept could evolve beyond the demonstration without claiming plant-wide completeness. The emphasis is on originality, usefulness, reasoning, and evidence that the proposed twin solves the selected problem.
2.1 What the Challenge Is Really Asking
•	Choose a specific manufacturing need instead of attempting to digitize an entire factory.
•	Create a virtual representation with a meaningful relationship to a real process, product, asset or material flow.
•	Show how the virtual model is kept current through real or simulated events/data.
•	Demonstrate operational insight rather than only visualization.
•	Enable users to evaluate alternatives, scenarios or decisions.
•	State assumptions, boundaries, required data and intended users.
•	Define measurable success criteria.
•	Explain a credible path from proof of concept to industrial deployment.
•	Demonstrate originality and usefulness without claiming plant-wide completeness.
3. Selected Manufacturing Need
The selected need is product-centric manufacturing traceability and material-flow intelligence within a defined production flow. In manufacturing, information about a product can be distributed across production records, quality records, warehouse records, machine logs, spreadsheets and enterprise systems. When a quality deviation or delay occurs, teams may need to reconstruct the product journey manually.
TwinTrace AI creates a connected digital representation of the product and its manufacturing context. Each product has a unique digital identity. As the product moves through defined process stages, events are recorded and reflected in the twin. The same event stream supports traceability, quality investigation, bottleneck analysis and scenario evaluation.
3.1 Practical Pain Points
•	A failed product can require manual reconstruction of its manufacturing journey.
•	Material and product movement may exist in disconnected systems.
•	Production teams may know a bottleneck exists without quickly identifying its cause.
•	Historical information may explain what happened but not what to do next.
•	A machine dashboard may show status without maintaining a product-to-process relationship.
•	Manual reconciliation of product, batch, machine and quality data increases investigation time.
3.2 Judge-Facing Problem Statement
Manufacturing teams need a connected operational view of product movement, process history, material flow and quality state. When these relationships are fragmented, tracing a product, identifying a defect source, locating a bottleneck or evaluating an alternative production route becomes slower and more error-prone. We propose a bounded factory digital twin that maintains a live virtual representation of a selected manufacturing flow and its products, using NFC/QR identity and event data to connect physical operations with digital state, analytics and what-if decision support.
4. Proposed Solution – TwinTrace AI
TwinTrace AI is a product-centric factory digital twin. It combines a virtual model of a selected factory flow with a digital thread for each product. NFC/QR provides the physical-to-digital identity bridge. Manufacturing events update the virtual state. Analytics and simulation convert that state into operational intelligence.
PHYSICAL FACTORY
Raw Material → Machining → Assembly → Quality → Finished Goods
       │             │           │          │
       └─────────────┴───────────┴──────────┘
                    Events
                      │
              NFC / QR / IoT / APIs
                      ▼
               TWINTRACE AI
       ┌──────────────┼──────────────┐
       │              │              │
 Product Twin   Factory Twin   Digital Thread
       │              │              │
       └──────────────┼──────────────┘
                      ▼
          Analytics + AI + Simulation
                      ▼
       Operational Insight & Decisions

4.1 Solution Components
•	Factory Twin – virtual representation of the selected production area, assets, stations and material-flow routes.
•	Product Twin – digital representation of each tracked product, including identity, current location, process status and quality state.
•	Digital Thread – chronological relationship among raw material, process stages, machine/asset, batch, inspection and product state.
•	Event Layer – ingestion of scans, process completion, quality results and simulated machine/IoT signals.
•	Analytics Layer – KPI computation, bottleneck identification, queue analysis, defect correlation and anomaly detection.
•	Simulation Layer – what-if evaluation for machine downtime, workload redistribution, routing changes or production demand.
•	Decision Dashboard – visual interface for factory users to understand current state, trace products and compare scenarios.
5. POC Scope and Boundaries
The POC intentionally models one representative manufacturing flow rather than an entire factory. This makes the demonstration achievable, measurable and credible.
In Scope	Out of Scope for POC
One selected production flow	Plant-wide digital twin
Small asset group / production stations	Every machine and subsystem
Product identity and lifecycle	Full enterprise master-data integration
Material movement	Complete logistics network
Selected quality events	All quality laboratory systems
Synthetic / simulated production data	Direct proprietary L&T system connection
NFC/QR identity bridge	Mass deployment of physical tags
Selected AI analytics	Safety-critical production AI
Bounded what-if simulation	Certified plant simulation
Web dashboard	MES/ERP replacement

5.1 Assumptions
•	The selected flow can be represented as stations, assets and routes.
•	Each tracked product has a unique identifier.
•	Manufacturing events have timestamps and can be associated with a product and process stage.
•	Quality records can be associated with product, batch, process stage or asset.
•	Synthetic data may represent machine, production and quality signals for the POC.
•	NFC/QR is treated as an identity event, not a replacement for industrial automation protocols.
•	Simulation results are decision-support estimates, not machine-control commands.
6. Intended Users and User Journeys
User	Need	TwinTrace Capability
Production Supervisor	See current flow and bottlenecks	Factory view, queues, utilization, alerts, scenarios
Quality Engineer	Trace defects to process context	Product history, batch/machine correlation, quality timeline
Operations/Maintenance Engineer	Understand asset impact	Asset status, anomaly indicators, downtime simulation
Plant/Operations Manager	Evaluate alternatives	KPI dashboard, scenario comparison, impact estimates
Warehouse/Dispatch User	Verify identity and status	NFC/QR scan, lifecycle, release/hold state

6.1 Primary User Journey
1.	A product receives a unique NFC/QR identity.
2.	The product enters the selected production flow.
3.	At each defined station, a scan or process event updates its digital state.
4.	The factory twin updates product location and process state.
5.	Quality results and process metadata are attached to the digital thread.
6.	The user scans the product and reconstructs its lifecycle.
7.	Analytics compare current and historical process behavior.
8.	The user runs a what-if scenario such as machine downtime or workload redistribution.
9.	The twin presents expected operational impact to support a decision.
7. System Architecture
                           ┌──────────────────────┐
                           │  Physical Factory    │
                           │ Machines / Stations  │
                           └──────────┬───────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   │                  │                  │
                NFC/QR             IoT/MQTT          APIs/CSV
                   └──────────────────┼──────────────────┘
                                      ▼
                           ┌──────────────────────┐
                           │   Event Ingestion    │
                           │ REST / MQTT Gateway  │
                           └──────────┬───────────┘
                                      ▼
                           ┌──────────────────────┐
                           │  Digital Twin Core   │
                           │ Assets / Products /  │
                           │ Stations / Routes    │
                           └───────┬──────┬───────┘
                                   │      │
                    ┌──────────────┘      └───────────────┐
                    ▼                                     ▼
          ┌────────────────────┐                ┌──────────────────┐
          │ Digital Thread DB │                │ Analytics / AI   │
          │ Events / Quality   │                │ Anomaly / KPI    │
          └─────────┬──────────┘                └────────┬─────────┘
                    └────────────────┬───────────────────┘
                                     ▼
                           ┌──────────────────────┐
                           │ Simulation Engine    │
                           │ What-if Scenarios    │
                           └──────────┬───────────┘
                                      ▼
                           ┌──────────────────────┐
                           │ TwinTrace Dashboard  │
                           └──────────────────────┘

7.1 Recommended Technology Stack
Layer	Technology	Purpose
Frontend	React.js + Tailwind CSS	Dashboard and interaction
Visualization	Three.js / React Three Fiber or 2D factory map	Virtual factory
Backend	Node.js + Express	APIs and business logic
Database	MongoDB or PostgreSQL	Products, events, assets, quality
AI/Analytics	Python, Pandas, scikit-learn	Anomaly and KPI logic
Simulation	Python / discrete-event logic	What-if scenarios
Identity	NFC / QR	Physical-digital bridge
Messaging	MQTT for simulated IoT	Event streaming
Deployment	Vercel + cloud backend	Demo deployment

8. Digital Twin Data Model
The model must represent entities and relationships, not merely store a product record. This is essential to demonstrate that the project is a digital twin rather than a tracking application.
Entity	Key Fields	Relationship
Product	product_id, tag_id, batch_id, status, current_station	Moves through process
Material Batch	material_id, supplier_lot, quantity, specification	Consumed by products
Station	station_id, type, capacity, status	Processes products
Asset/Machine	asset_id, utilization, health, status	Performs operations
Process Event	event_id, product_id, station_id, timestamp, operation	Creates digital thread
Quality Record	inspection_id, product_id, result, defect_type	Updates quality state
Route	route_id, from_station, to_station, travel_time	Defines material flow
Scenario	scenario_id, change, assumptions, outputs	Stores what-if analysis
Alert	alert_id, severity, type, entity_id	Surfaces issues

8.1 Example Product Twin
Product ID: TT-2026-000184
NFC/QR ID: TAG-184
Material Batch: RM-1092
Production Order: PO-47281
Current Station: QUALITY-01
Status: INSPECTION
Quality: PASS_PENDING_FINAL

Lifecycle:
09:12  Raw material issued
10:05  CNC-03 completed
11:17  Assembly-02 completed
11:54  Quality inspection started

9. Keeping the Twin Current
A core judging requirement is that the twin remains connected to the real-world process. For the POC, this is demonstrated through event-driven updates. A physical or simulated event generates a digital event, which updates the corresponding entity.
Event	Physical Meaning	Twin Update
TAG_SCAN	Product identified at station	Current station and timestamp
PROCESS_START	Operation begins	Product status = processing
PROCESS_COMPLETE	Operation finishes	Lifecycle event + next route
QUALITY_PASS	Inspection passed	Quality state updated
QUALITY_FAIL	Inspection failed	Hold status + alert
MACHINE_DOWN	Asset unavailable	Capacity/route inputs updated
MACHINE_RECOVERED	Asset available	Asset returns to active
MATERIAL_MOVE	Material/product moved	Flow position updated

9.1 Example Event
{
  "event_type": "PROCESS_COMPLETE",
  "timestamp": "2026-09-28T11:17:00",
  "product_id": "TT-2026-000184",
  "station_id": "ASSEMBLY-02",
  "asset_id": "A02",
  "operation": "ASSEMBLY",
  "cycle_time_sec": 412,
  "batch_id": "RM-1092"
}

10. Intelligence and Analytics
10.1 Core KPIs
•	Throughput – completed units per hour/day.
•	Cycle time – average and percentile process time.
•	Queue length – products waiting at each station.
•	Machine utilization – active time versus available time.
•	Defect rate – failed inspections divided by inspected units.
•	First-pass yield – units passing without rework.
•	Lead time – production start to completion.
•	On-time completion – percentage meeting target completion time.
10.2 Explainable Bottleneck Detection
For the hackathon, an explainable score is preferable to a black-box model. Rank stations using utilization, queue growth, cycle-time deviation and downstream impact.
Bottleneck Score =
0.40 × Utilization
+ 0.30 × Normalized Queue
+ 0.20 × Cycle-Time Deviation
+ 0.10 × Downstream Impact

10.3 Anomaly Detection
Candidate inputs include cycle time, queue length, temperature, vibration, rejection rate and process deviation. A simple Isolation Forest or statistical baseline can be used. The dashboard should show the evidence behind each alert.
10.4 Quality Correlation
Group quality failures by machine, batch, process stage and time window. The goal is to move from a failed product to the relevant manufacturing context quickly.
11. What-if Simulation and Decision Support
Scenario evaluation is the strongest way to satisfy the challenge's alternative-evaluation requirement. The simulation engine should be bounded and transparent about assumptions.
Scenario	Question	Outputs
Machine downtime	What if CNC-03 stops for 60 minutes?	Throughput, queue growth, delay
Workload redistribution	What if 30% moves to CNC-02?	Utilization, lead time, capacity
Demand increase	What if demand rises 20%?	Capacity gap, bottleneck
Route change	What if an alternate station is used?	Lead time and queue comparison
Inspection capacity	What if one more quality station is added?	Queue reduction, throughput

11.1 Example Demo Output
BASELINE
Throughput: 100 units/day
Bottleneck: CNC-03
Avg. lead time: 8.2 hours

SCENARIO: CNC-03 DOWN FOR 60 MINUTES
Estimated throughput: 77 units/day
Lead time: 10.1 hours
Queue increase: +41%

ALTERNATIVE: SHIFT 30% TO CNC-02
Estimated throughput: 96 units/day
Lead time: 8.8 hours
Queue increase: +9%

NOTE: These are placeholder figures. Replace them with
outputs from the implemented simulation before judging.

Never present placeholder values as measured results. The final demo must use numbers generated by the actual model or label them clearly as assumptions.
12. Dashboard / UI Plan
Screen	Key Elements	Judge Message
Factory Twin	Factory map, stations, asset state, material flow	This is the virtual factory context.
Product Twin	Scan, lifecycle, current station, quality	Every physical product has a digital counterpart.
Trace Explorer	Timeline, batch, machine, route, inspection	The digital thread connects lifecycle events.
Analytics	Throughput, cycle time, utilization, defects	The twin creates operational insight.
AI Alerts	Bottleneck, anomaly, defect correlation	The system identifies attention areas.
Simulation	Scenario controls and comparison charts	Users can evaluate alternatives.
History	Past state reconstruction	The twin can be examined over time.

12.1 Live Demo Order
10.	Open Factory Twin and show the selected production flow.
11.	Show active stations, queues and product movement.
12.	Scan a product NFC/QR identity.
13.	Show the product appearing in the digital twin.
14.	Open its lifecycle and trace raw material → machine → assembly → quality.
15.	Trigger/select a quality failure.
16.	Show the system tracing the affected product to process context.
17.	Open analytics and identify the bottleneck/anomaly.
18.	Run a machine-downtime scenario.
19.	Run an alternative-routing scenario.
20.	Compare results and state the operational decision.
21.	Close with the scale-up architecture.
13. Innovation and Differentiation
The innovation is the relationship among product identity, factory context, event-driven digital state, traceability, analytics and scenario evaluation. NFC is not claimed as the innovation by itself; it is the identity bridge.
Conventional	TwinTrace AI
Product tracking only	Product tracking inside a factory digital twin
Static product record	Continuously updated product state
Trace history	Trace history + factory context
Factory dashboard	Factory + product + material-flow relationship
Historical reporting	Historical analysis + anomaly detection
Monitoring	Monitoring + what-if decision support
Disconnected records	Digital thread across events
Single-purpose scan	Scan as physical-to-digital identity bridge

13.1 Potential IP Direction
A potential area for future IP investigation is a product-centric digital twin mechanism that dynamically associates physical product identity, manufacturing process events, material-flow state and quality information through an identity bridge, enabling real-time traceability and scenario-based manufacturing decision support. This is a research direction, not a claim of patentability; any patent claim requires formal prior-art research and legal review.
14. Data Requirements
Data	Minimum POC Fields	Possible Real Source
Product	product_id, tag_id, order_id, status	MES / ERP / scan events
Process	operation, station, start/end time	MES / operator terminal
Machine	asset_id, status, utilization	PLC / SCADA / IoT
Material	batch_id, lot, quantity	ERP / inventory
Quality	inspection, result, defect type	QMS / inspection
Flow	from, to, travel time	MES / routing model
Maintenance	downtime, reason, duration	CMMS / EAM
Environment	temperature, vibration, energy	IoT sensors

14.1 Synthetic Data Strategy
Because proprietary factory data may not be available, the POC can use a synthetic dataset that follows realistic manufacturing relationships. Events must have valid timestamps; products must follow valid routes; quality records must reference real products; and downtime must affect available capacity.
Recommended statement: “The POC uses synthetic/simulated data to demonstrate the architecture. In deployment, the same event model can consume real factory sources such as MES, ERP, QMS, SCADA, PLC/IoT and maintenance systems.”
15. Measurable Success Criteria
Metric	POC Target	Demonstration
Trace retrieval	<10 sec	Scan product and open lifecycle
Twin update latency	<2 sec demo	Trigger event and observe state change
Trace completeness	≥95% defined events	Expected vs captured event chain
Scenario response	<5 sec	Run bounded simulation
Bottleneck detection	Injected bottleneck identified	Stress one station and verify alert
Quality investigation	Product → batch/station	Use failed product scenario
Usability	Critical insight ≤3 interactions	Observe dashboard workflow
Explainability	Every alert has factors	Show queue/utilization/cycle-time evidence

These are proposed POC goals. Before judging, replace them with observed results from the actual prototype wherever possible.
16. Evolution Beyond the Demonstration
22.	Phase 1 – POC: One production flow, synthetic data, NFC/QR, dashboard, analytics and bounded simulation.
23.	Phase 2 – Pilot: Connect one real production area to MES/ERP/QMS or IoT data.
24.	Phase 3 – Multi-asset Twin: Add machine health, maintenance and richer sensor streams.
25.	Phase 4 – Multi-line Twin: Add multiple lines, shared resources and cross-line material flow.
26.	Phase 5 – Enterprise Twin: Integrate plant, supply-chain, quality, maintenance and planning domains.
27.	Phase 6 – Optimization: Use validated simulation and optimization for constrained production decisions.
16.1 Integration Targets
•	MES – work orders and process events.
•	ERP – materials, orders and inventory.
•	QMS – inspection and non-conformance.
•	SCADA/PLC gateways – machine state.
•	IoT platforms – sensor streams.
•	CMMS/EAM – maintenance events.
•	Identity and access management – role-based use.
•	Event streaming – scalable real-time updates.
17. Risks, Limitations and Mitigations
Risk / Limitation	Impact	Mitigation
Synthetic data differs from real plant data	Generalization risk	State assumptions; validate with real data later
Overly broad scope	Incomplete demo	Keep strict POC boundary
3D consumes time	Core features delayed	Use 2D if needed
AI appears superficial	Low credibility	Use explainable metrics
Simulation unrealistic	Judges lose trust	Transparent assumptions + consistent model
NFC mistaken for whole solution	Weak alignment	Position NFC as identity bridge
No live plant data	Weak physical link	Event-driven updates + integration roadmap
Too many features	Unfinished prototype	Protect end-to-end demo path

18. Security and Governance
•	Use role-based access in a real deployment.
•	Protect APIs with authentication and authorization.
•	Maintain audit trails for important changes and decisions.
•	Separate read-only monitoring from machine-control commands.
•	Do not allow the hackathon simulation to control physical machines.
•	Protect product, supplier and manufacturing data.
•	Use secure device identity for industrial IoT sources.
19. Pitch Deck Structure
Slide	Title	Purpose
1	TwinTrace AI	One-line value proposition
2	Manufacturing Problem	Fragmented product/process/quality information
3	Why Digital Twin	Physical factory context ↔ virtual state
4	Our Solution	Product twin + factory twin + digital thread
5	Architecture	Event-driven system
6	Live Product Trace	NFC/QR → lifecycle
7	Factory Intelligence	KPI + bottleneck + anomaly
8	What-if Simulation	Compare alternatives
9	Impact & Success	Measured POC results
10	Scale-up	MES/ERP/QMS/SCADA/IoT integration

19.1 Opening Script
“Imagine a component failing inspection on a busy production line. The immediate questions are: where was it made, which machine processed it, which material batch did it come from, what else may be affected, and what should production do next? Today, those answers can be distributed across multiple systems. TwinTrace AI creates a product-centric factory digital twin. NFC or QR gives the physical product a digital identity, manufacturing events update its twin, and the digital thread connects material, process and quality history. Analytics identify bottlenecks and anomalies, while what-if simulation lets the operator compare alternatives before making a decision. Our goal is simple: not just to know what happened, but to understand what is happening and decide what to do next.”
19.2 Closing Script
“TwinTrace AI demonstrates how a bounded factory digital twin can connect the physical product, manufacturing process and operational decision. We are not claiming a complete plant-wide twin. We are demonstrating a practical foundation that can evolve through real industrial data integration, richer asset models and validated simulation.”
20. Judge Q&A – Prepare These Answers
Q: Is this just an NFC tracking system?
A: No. NFC is the physical-to-digital identity bridge. The core is the factory digital twin: product state, factory context, material flow, event history, analytics and scenario evaluation.
Q: Where is the digital twin?
A: The twin is the virtual model of the selected production flow, stations/assets, products and material routes. Its state is updated by manufacturing events.
Q: How is it different from a dashboard?
A: A dashboard reports metrics. Our twin maintains relationships among product, process, asset, material and quality state and uses those relationships for traceability and what-if analysis.
Q: How does the twin stay current?
A: Through event ingestion: scans, process events, quality events and simulated machine/IoT events update digital entities.
Q: Are you using real factory data?
A: The POC uses synthetic/simulated data because proprietary plant data is not available. The event model is designed so real MES, ERP, QMS, SCADA and IoT sources can replace simulated sources.
Q: Why use AI?
A: AI is used selectively for anomaly detection, bottleneck risk and process/quality correlation, with contributing factors shown for explainability.
Q: How accurate is the simulation?
A: It is a bounded decision-support model, not a certified plant simulator. Its assumptions are explicit; industrial deployment would require calibration with real process data.
Q: Can this control machines?
A: Not in the POC. It is decision support. Real control integration would require safety, validation and industrial control governance.
Q: What is novel?
A: The POC combines product identity, factory context, material-flow state, digital thread, quality context and what-if decision support in one product-centric twin architecture.
Q: Can it scale?
A: Yes. The architecture separates the twin model, event layer, analytics and UI so lines, assets and data sources can be added incrementally.
Q: Why is this relevant to L&T?
A: It targets common engineering-manufacturing concerns: traceability, quality, asset utilization, material flow and operational decisions, while remaining bounded and technology-neutral.
Q: What happens when a product fails quality?
A: The product is placed on hold, its digital thread is opened, and the system traces it through material batch, process stations and associated asset events.
21. Suggested Demo Factory
RAW MATERIAL STORE
      │
      ▼
CNC-01 ─────┐
CNC-02 ─────┼──→ ASSEMBLY-01 ──→ QUALITY-01 ──→ FINISHED GOODS
CNC-03 ─────┘

Tracked product: TT-2026-000184
Material batch: RM-1092
Quality issue: dimensional deviation
Bottleneck: CNC-03
What-if: CNC-03 unavailable for 60 minutes

21.1 Minimum Synthetic Dataset
Dataset	Recommended Records
Products	100–500
Machines	3 CNC + 1 assembly + 1 quality
Process Events	1,000+
Quality Records	50–150
Material Batches	10–20
Machine Signals	Cycle time/utilization + optional temperature/vibration
Scenarios	At least 3

22. Hackathon Build Plan
Workstream	Deliverable	Priority
Problem & Story	Final framing and user journey	P0
Data Model	Product, asset, event, quality, route schemas	P0
Backend	APIs + event ingestion + twin state	P0
Frontend	Factory + product + analytics screens	P0
Traceability	NFC/QR scan + lifecycle	P0
Analytics	KPIs + bottleneck/anomaly logic	P0
Simulation	Machine-down + alternate-routing	P0
Demo Data	Consistent synthetic dataset	P0
Visualization	2D/3D factory view	P1
PPT	10-slide pitch	P0
Testing	End-to-end rehearsal	P0
Backup	Recorded/static fallback	P0

22.1 Priority Rule
If time becomes limited, protect the complete demo chain in this order: product identity → event update → twin state → traceability → analytics → simulation → visualization polish. A working end-to-end story is more valuable than isolated advanced features.
23. Final Judging Checklist
•	We clearly state the selected manufacturing need.
•	We define the exact POC boundary.
•	We show a virtual representation of real manufacturing context.
•	We demonstrate a physical-to-digital relationship.
•	We demonstrate how the twin is updated.
•	We trace at least one product end-to-end.
•	We show material flow.
•	We provide operational insight.
•	We demonstrate at least one meaningful AI/analytics use case.
•	We demonstrate at least one what-if scenario.
•	We use measurable success criteria.
•	We state assumptions and data requirements.
•	We explain limitations instead of overclaiming.
•	We show how the system can evolve to real industrial data.
•	We have a stable demo path and backup evidence.
•	Every number shown in the final demo comes from the prototype or is clearly labeled as an assumption.
Appendix A – Recommended Terminology
Term	Meaning in TwinTrace AI
Digital Twin	Virtual representation of a physical manufacturing context whose state is updated from relevant data/events.
Product Twin	Digital representation of an individual physical product.
Factory Twin	Virtual representation of the selected production area, assets, stations and material-flow context.
Digital Thread	Connected lifecycle record linking product, material, process, asset and quality events.
Event	Timestamped occurrence that changes or informs twin state.
Material Flow	Movement of material/products among defined stations or locations.
Scenario	Bounded hypothetical change used to evaluate operational impact.
POC	Proof of concept demonstrating feasibility within defined boundaries.

Appendix B – Exact Demo Sequence
28.	Open Factory Twin.
29.	State the POC boundary: one representative manufacturing flow.
30.	Show stations, machine states, queues and product flow.
31.	Scan product TT-2026-000184.
32.	Show Product Twin and lifecycle.
33.	Open Trace Explorer: material batch → machine → assembly → quality.
34.	Trigger/select a failed inspection.
35.	Show trace-back and alert.
36.	Open Analytics and show bottleneck evidence.
37.	Run CNC-03 downtime scenario.
38.	Run alternate-routing scenario.
39.	Compare results.
40.	State the decision supported.
41.	Show scale-up architecture.
Appendix C – Claims to Avoid
•	Do not claim a complete enterprise-wide factory twin.
•	Do not claim production-grade AI without validation.
•	Do not claim exact plant prediction from a hackathon simulation.
•	Do not claim patentability without prior-art research.
•	Do not imply NFC alone creates a digital twin.
•	Do not present synthetic data as real L&T data.
•	Do not claim operational control or safety certification.
Appendix D – One-Page Summary
TwinTrace AI is a bounded product-centric factory digital twin for L&T Techgium Problem #29. It focuses on a defined manufacturing/material-flow scenario. Every tracked product receives a digital identity through NFC/QR. Manufacturing and quality events update the digital twin and create a digital thread connecting material, process, asset and quality context. A dashboard visualizes current factory state and product lifecycle. Analytics identify bottlenecks, anomalies and quality correlations. A bounded simulation engine lets users evaluate machine downtime, workload redistribution and routing alternatives. The POC uses synthetic data but defines a clear integration path to MES, ERP, QMS, SCADA, PLC/IoT and maintenance systems. It is intentionally scoped to demonstrate feasibility, usefulness, reasoning and measurable operational value without claiming plant-wide completeness.
