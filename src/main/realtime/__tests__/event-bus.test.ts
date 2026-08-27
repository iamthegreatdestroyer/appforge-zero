/**
 * EventBus Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryEventBus } from "../event-bus";
import { EventPayload } from "../types";

describe("EventBus", () => {
  let eventBus: InMemoryEventBus;

  beforeEach(() => {
    eventBus = new InMemoryEventBus();
  });

  describe("publish", () => {
    it("should publish an event", async () => {
      const payload: EventPayload = {
        topic: "user.connected",
        userId: "user-123",
        connectionId: "conn-456",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload);

      const events = eventBus.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(payload);
    });

    it("should publish multiple events", async () => {
      const payload1: EventPayload = {
        topic: "user.connected",
        userId: "user-1",
        connectionId: "conn-1",
        timestamp: new Date(),
      };

      const payload2: EventPayload = {
        topic: "user.disconnected",
        userId: "user-2",
        connectionId: "conn-2",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload1);
      await eventBus.publish("user.disconnected", payload2);

      const events = eventBus.getEvents();
      expect(events).toHaveLength(2);
      expect(events[0]).toEqual(payload1);
      expect(events[1]).toEqual(payload2);
    });

    it("should include metadata in event payload", async () => {
      const payload: EventPayload = {
        topic: "user.connected",
        userId: "user-123",
        connectionId: "conn-456",
        timestamp: new Date(),
        data: {
          userAgent: "Mozilla/5.0",
          ipAddress: "192.168.1.1",
        },
      };

      await eventBus.publish("user.connected", payload);

      const events = eventBus.getEvents();
      expect(events[0].data).toEqual(payload.data);
    });
  });

  describe("subscribe", () => {
    it("should notify subscribers when event is published", async () => {
      const receivedEvents: EventPayload[] = [];

      eventBus.subscribe("user.connected", (payload) => {
        receivedEvents.push(payload);
      });

      const payload: EventPayload = {
        topic: "user.connected",
        userId: "user-123",
        connectionId: "conn-456",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload);

      expect(receivedEvents).toHaveLength(1);
      expect(receivedEvents[0]).toEqual(payload);
    });

    it("should support multiple subscribers for the same topic", async () => {
      const receivedEvents1: EventPayload[] = [];
      const receivedEvents2: EventPayload[] = [];

      eventBus.subscribe("user.connected", (payload) => {
        receivedEvents1.push(payload);
      });

      eventBus.subscribe("user.connected", (payload) => {
        receivedEvents2.push(payload);
      });

      const payload: EventPayload = {
        topic: "user.connected",
        userId: "user-123",
        connectionId: "conn-456",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload);

      expect(receivedEvents1).toHaveLength(1);
      expect(receivedEvents2).toHaveLength(1);
    });

    it("should only notify subscribers of matching topic", async () => {
      const connectedEvents: EventPayload[] = [];
      const disconnectedEvents: EventPayload[] = [];

      eventBus.subscribe("user.connected", (payload) => {
        connectedEvents.push(payload);
      });

      eventBus.subscribe("user.disconnected", (payload) => {
        disconnectedEvents.push(payload);
      });

      const payload: EventPayload = {
        topic: "user.connected",
        userId: "user-123",
        connectionId: "conn-456",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload);

      expect(connectedEvents).toHaveLength(1);
      expect(disconnectedEvents).toHaveLength(0);
    });
  });

  describe("getEvents", () => {
    it("should return empty array when no events published", () => {
      const events = eventBus.getEvents();
      expect(events).toEqual([]);
    });

    it("should return all published events", async () => {
      const payload1: EventPayload = {
        topic: "user.connected",
        userId: "user-1",
        connectionId: "conn-1",
        timestamp: new Date(),
      };

      const payload2: EventPayload = {
        topic: "user.disconnected",
        userId: "user-2",
        connectionId: "conn-2",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload1);
      await eventBus.publish("user.disconnected", payload2);

      const events = eventBus.getEvents();
      expect(events).toHaveLength(2);
    });
  });

  describe("clearEvents", () => {
    it("should clear all events", async () => {
      const payload: EventPayload = {
        topic: "user.connected",
        userId: "user-123",
        connectionId: "conn-456",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload);
      expect(eventBus.getEvents()).toHaveLength(1);

      eventBus.clearEvents();
      expect(eventBus.getEvents()).toHaveLength(0);
    });
  });

  describe("close", () => {
    it("should clear events on close", async () => {
      const payload: EventPayload = {
        topic: "user.connected",
        userId: "user-123",
        connectionId: "conn-456",
        timestamp: new Date(),
      };

      await eventBus.publish("user.connected", payload);
      expect(eventBus.getEvents()).toHaveLength(1);

      await eventBus.close();
      expect(eventBus.getEvents()).toHaveLength(0);
    });
  });
});
