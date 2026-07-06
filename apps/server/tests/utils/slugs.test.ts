import { describe, expect, it } from "vitest";
import { normalizeSlug, normalizeUsername, isValidUsername } from "../../src/utils/slugs.js";

describe("slugs utility", () => {
  describe("normalizeSlug", () => {
    it("handles standard ascii text", () => {
      expect(normalizeSlug("Hello World")).toBe("hello-world");
      expect(normalizeSlug("my-awesome-post")).toBe("my-awesome-post");
    });

    it("strips accents and diacritics for international characters", () => {
      expect(normalizeSlug("José Müller")).toBe("jose-muller");
      expect(normalizeSlug("Crème Brûlée")).toBe("creme-brulee");
      expect(normalizeSlug("São Paulo")).toBe("sao-paulo");
    });

    it("falls back to default word if the result would be empty", () => {
      expect(normalizeSlug("   ")).toBe("document");
      expect(normalizeSlug("???")).toBe("document");
    });

    it("caps length at 255 characters", () => {
      const longInput = "a".repeat(300);
      expect(normalizeSlug(longInput).length).toBe(255);
    });
  });

  describe("normalizeUsername", () => {
    it("strips accents and normalizes to lowercase", () => {
      expect(normalizeUsername("José.Müller")).toBe("jose-muller");
    });

    it("caps length at 32 characters", () => {
      const longInput = "a".repeat(100);
      expect(normalizeUsername(longInput).length).toBe(32);
    });
  });

  describe("isValidUsername", () => {
    it("identifies valid usernames", () => {
      expect(isValidUsername("jose_muller")).toBe(true);
      expect(isValidUsername("user-123")).toBe(true);
    });

    it("rejects reserved usernames", () => {
      expect(isValidUsername("admin")).toBe(false);
      expect(isValidUsername("veriworkly")).toBe(false);
    });

    it("rejects too short or too long usernames", () => {
      expect(isValidUsername("ab")).toBe(false);
      expect(isValidUsername("a".repeat(33))).toBe(false);
    });
  });
});
