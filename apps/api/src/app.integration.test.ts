import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("API route integration", () => {
  it("mounts the versioned API boundary with a stable envelope", async () => {
    const response = await request(createApp()).get("/api/v1");

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual({
      name: "FinSight API",
      version: "v1",
    });
    expect(response.body.requestId).toBeTruthy();
  });
});
