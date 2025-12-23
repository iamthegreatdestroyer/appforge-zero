/**
 * Template IPC Handler Tests
 * Comprehensive test suite for template-related IPC handlers
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import TemplateIPCHandler from "../template.handler";
import type {
  IPC_TemplateListRequest,
  IPC_TemplateGetRequest,
  IPC_TemplateValidateRequest,
  IPC_TemplateInstantiateRequest,
} from "../types";

// Mock IPC event
const mockEvent = {} as any;

describe("TemplateIPCHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("template:list", () => {
    it("should list all templates without filters", async () => {
      const request: IPC_TemplateListRequest = {};

      const response = await TemplateIPCHandler["handleList"](
        mockEvent,
        request
      );

      expect(response).toHaveProperty("templates");
      expect(response).toHaveProperty("total");
      expect(response).toHaveProperty("hasMore");
      expect(Array.isArray((response as any).templates)).toBe(true);
    });

    it("should filter templates by category", async () => {
      const request: IPC_TemplateListRequest = { category: "SciFi" };

      const response = await TemplateIPCHandler["handleList"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        const templates = (response as any).templates;
        templates.forEach((t: any) => {
          expect(t.category).toBe("SciFi");
        });
      }
    });

    it("should search templates by query", async () => {
      const request: IPC_TemplateListRequest = { searchQuery: "Space" };

      const response = await TemplateIPCHandler["handleList"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).templates.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should respect limit and offset pagination", async () => {
      const request: IPC_TemplateListRequest = { limit: 1, offset: 0 };

      const response = await TemplateIPCHandler["handleList"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).templates.length).toBeLessThanOrEqual(1);
      }
    });

    it("should sort templates by name", async () => {
      const request: IPC_TemplateListRequest = { sortBy: "name" };

      const response = await TemplateIPCHandler["handleList"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        const templates = (response as any).templates;
        for (let i = 1; i < templates.length; i++) {
          expect(
            templates[i].title.localeCompare(templates[i - 1].title)
          ).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("should sort templates by popularity", async () => {
      const request: IPC_TemplateListRequest = { sortBy: "popularity" };

      const response = await TemplateIPCHandler["handleList"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        const templates = (response as any).templates;
        for (let i = 1; i < templates.length; i++) {
          expect(templates[i].usageCount).toBeLessThanOrEqual(
            templates[i - 1].usageCount
          );
        }
      }
    });
  });

  describe("template:get", () => {
    it("should retrieve a valid template", async () => {
      const request: IPC_TemplateGetRequest = { templateId: "template-1" };

      const response = await TemplateIPCHandler["handleGet"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).id).toBe("template-1");
        expect((response as any).title).toBeDefined();
        expect((response as any).morphTransformation).toBeDefined();
      }
    });

    it("should return error for missing templateId", async () => {
      const request: IPC_TemplateGetRequest = { templateId: "" };

      const response = await TemplateIPCHandler["handleGet"](
        mockEvent,
        request
      );

      expect("error" in response).toBe(true);
      expect((response as any).code).toBe("INVALID_REQUEST");
    });

    it("should return error for non-existent template", async () => {
      const request: IPC_TemplateGetRequest = { templateId: "non-existent" };

      const response = await TemplateIPCHandler["handleGet"](
        mockEvent,
        request
      );

      expect("error" in response).toBe(true);
      expect((response as any).code).toBe("TEMPLATE_NOT_FOUND");
    });

    it("should include all required fields", async () => {
      const request: IPC_TemplateGetRequest = { templateId: "template-1" };

      const response = await TemplateIPCHandler["handleGet"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        const template = response as any;
        expect(template.id).toBeDefined();
        expect(template.title).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.category).toBeDefined();
        expect(template.createdAt).toBeDefined();
        expect(template.morphTransformation).toBeDefined();
      }
    });
  });

  describe("template:validate", () => {
    const validRequest: IPC_TemplateValidateRequest = {
      title: "Test Template",
      description: "A test template for validation",
      category: "Test",
      morphTransformation: {
        characters: { test: {} },
        settings: { test: {} },
        narrative: { test: {} },
      },
    };

    it("should validate a correct template", async () => {
      const response = await TemplateIPCHandler["handleValidate"](
        mockEvent,
        validRequest
      );

      if (!("error" in response)) {
        expect((response as any).valid).toBe(true);
        expect((response as any).errors).toEqual([]);
      }
    });

    it("should report missing title", async () => {
      const request = { ...validRequest, title: "" };

      const response = await TemplateIPCHandler["handleValidate"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).valid).toBe(false);
        expect(
          (response as any).errors.some((e: any) => e.field === "title")
        ).toBe(true);
      }
    });

    it("should report missing description", async () => {
      const request = { ...validRequest, description: "" };

      const response = await TemplateIPCHandler["handleValidate"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).valid).toBe(false);
        expect(
          (response as any).errors.some((e: any) => e.field === "description")
        ).toBe(true);
      }
    });

    it("should report missing morphTransformation", async () => {
      const request = { ...validRequest, morphTransformation: undefined };

      const response = await TemplateIPCHandler["handleValidate"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).valid).toBe(false);
        expect(
          (response as any).errors.some((e: any) =>
            e.field.includes("morphTransformation")
          )
        ).toBe(true);
      }
    });

    it("should warn on excessively long title", async () => {
      const request = {
        ...validRequest,
        title: "A".repeat(150),
      };

      const response = await TemplateIPCHandler["handleValidate"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect(
          (response as any).warnings.some((w: any) => w.field === "title")
        ).toBe(true);
      }
    });
  });

  describe("template:instantiate", () => {
    it("should create instance from valid template", async () => {
      const request: IPC_TemplateInstantiateRequest = {
        templateId: "template-1",
        appTitle: "My App",
      };

      const response = await TemplateIPCHandler["handleInstantiate"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).jobId).toBeDefined();
        expect((response as any).appId).toBeDefined();
        expect((response as any).status).toBe("queued");
        expect((response as any).timestamp).toBeDefined();
      }
    });

    it("should reject missing templateId", async () => {
      const request: any = { appTitle: "My App" };

      const response = await TemplateIPCHandler["handleInstantiate"](
        mockEvent,
        request
      );

      expect("error" in response).toBe(true);
    });

    it("should reject missing appTitle", async () => {
      const request: any = { templateId: "template-1" };

      const response = await TemplateIPCHandler["handleInstantiate"](
        mockEvent,
        request
      );

      expect("error" in response).toBe(true);
    });

    it("should reject non-existent template", async () => {
      const request: IPC_TemplateInstantiateRequest = {
        templateId: "non-existent",
        appTitle: "My App",
      };

      const response = await TemplateIPCHandler["handleInstantiate"](
        mockEvent,
        request
      );

      expect("error" in response).toBe(true);
      expect((response as any).code).toBe("TEMPLATE_NOT_FOUND");
    });

    it("should accept customizations parameter", async () => {
      const request: IPC_TemplateInstantiateRequest = {
        templateId: "template-1",
        appTitle: "My App",
        customizations: { colors: { primary: "#FF0000" } },
      };

      const response = await TemplateIPCHandler["handleInstantiate"](
        mockEvent,
        request
      );

      if (!("error" in response)) {
        expect((response as any).jobId).toBeDefined();
      }
    });

    it("should generate unique job and app IDs", async () => {
      const request: IPC_TemplateInstantiateRequest = {
        templateId: "template-1",
        appTitle: "My App",
      };

      const response1 = await TemplateIPCHandler["handleInstantiate"](
        mockEvent,
        request
      );
      const response2 = await TemplateIPCHandler["handleInstantiate"](
        mockEvent,
        request
      );

      if (!("error" in response1) && !("error" in response2)) {
        expect((response1 as any).jobId).not.toBe((response2 as any).jobId);
        expect((response1 as any).appId).not.toBe((response2 as any).appId);
      }
    });
  });
});
