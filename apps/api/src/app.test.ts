import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "./app";

describe("API foundation", () => {
  it("returns a request id and health envelope", async () => {
    const response = await request(createApp()).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.requestId).toBeTruthy();
    expect(response.headers["x-content-type-options"]).toBe("nosniff");
  });
});
