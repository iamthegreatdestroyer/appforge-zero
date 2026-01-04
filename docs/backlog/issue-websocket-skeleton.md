### Summary
Create a WebSocket Gateway skeleton that authenticates clients using the existing JWTManager and integrates with presence tracking and event publishing. This is the first implementation task for Epic 1 (WebSocket Gateway & Auth).

### Acceptance Criteria
- WebSocket gateway service skeleton under `src/main/realtime/` with clear separation between gateway and handlers.
- Gateway authenticates incoming WS connections by validating JWTs via existing `createAuthModule()` (or direct `JWTManager` verification).
- Presence is tracked via Redis Streams (writing `presence:userId:connId`) on connect and cleaned on disconnect.
- Gateway publishes user.connected and user.disconnected events to the event bus interface (stubbed; Kafka integration is a follow-up).
- Unit tests covering authentication handshake, presence tracking, and event publishing using mocks.
- Integration test (lightweight) showing an authenticated client can connect, presence updated, and events published (runs in CI).

### Implementation Notes
- Keep the service minimal and testable; use dependency injection for auth, redis and event bus so they can be mocked.
- Create an interface `EventBus.publish(topic, payload)` that can be implemented by Kafka in a later story.
- Add `src/main/realtime/__tests__` with jest tests.

### Labels
epic, phase/8, estimate/3d, realtime

### Milestone
Phase 8 - Real-Time

### Assign to
@copilot (coding agent)

---
Please implement this skeleton following the acceptance criteria, include unit & integration tests, and open a PR with the implementation.
