# ADR 0001: Real-time Architecture for Phase 8

Status: Proposed
Date: 2026-01-04

## Context
Phase 7 delivered a production-grade Authentication & Authorization subsystem. Phase 8 will add real-time functionality (WebSockets, notifications, activity streams, analytics) that must integrate with the auth layer, scale, be observable, and support automated deployment and compliance checks.

## Decision
Adopt a hybrid, event-driven design:

- Primary Event Bus: Kafka (durable, scalable) for core event streams and analytics ingestion.
- Lightweight Streams: Redis Streams for low-latency ephemeral flows (presence, notifications soft-state).
- WebSocket Gateway: dedicated stateless WebSocket gateway (uWebSockets or Socket.IO cluster) authenticated via JWTs validated against the existing JWTManager at the gateway.
- Notification Service: event-driven microservice consuming Kafka topics with per-user preference store and DLQ-enabled retry/backoff for delivery.
- Activity Storage: append-only partitioned event store (time/tenant partitioning) optimized for timeline queries; OLAP sink (ClickHouse or similar) fed by Kafka Connect for analytics.

## Consequences
- Pros:
  - High throughput and durability for events (Kafka).
  - Low-latency presence & ephemeral data via Redis Streams.
  - Separation of concerns (gateway + microservices) simplifies scaling and testing.
  - Analytics pipeline via Kafka Connect provides reliable aggregation and dashboards.
- Cons:
  - Increased infra complexity (Kafka + Redis + WS gateway).
  - Operational overhead for deploying and monitoring additional components.

## Alternatives Considered
- Single-store approach: use Redis only (insufficient durability/analytics capabilities).
- Serverless-only approach (FaaS + managed pub/sub): simpler infra but may not meet latency/throughput and has vendor lock-in concerns.

## Implementation Plan
1. Create ADR & C4 diagrams (this document + diagrams).  
2. Implement WS gateway prototype with JWT auth verification and presence tracking.  
3. Provision Kafka cluster and Redis with IaC.  
4. Implement Notification microservice consuming Kafka topics, persisting preferences, DLQ handling.  
5. Implement Activity stream producer/consumer; wire to analytics sink.  
6. Add observability and SLOs; instrument all new services.  
7. Add CI/CD canary pipeline, smoke tests and automated rollback logic.

## Automation & Safeguards
- CI will run e2e tests (auth+ws) on PRs.  
- Ephemeral environments will be created per PR via Terraform.  
- A GitHub Action will create repo issues for each epic automatically from `docs/backlog/phase8-epics.md` (see workflow).  

## Related
- docs/arch/c4-realtime-system.md
- docs/backlog/phase8-epics.md
- .github/workflows/create-issues-from-epics.yml

## Next steps
- Merge this ADR and iterate with the team; finalize precise infra sizing and service SLAs.


*Records:* ADR created by GitHub Copilot on request of maintainer for Phase 8 kickoff.
