import { describe, expect, it } from "vitest";
import { formatRate, summarize } from "./stats";

describe("summarize", () => {
  it("counts lessons as presence and ignores other/cleared marks", () => {
    expect(summarize(["present", "lesson", "absent", "other", "cleared", "present"])).toEqual({
      present: 3,
      absent: 1,
      lessons: 1,
      rate: 0.75,
    });
  });

  it("has no rate without recorded sessions", () => {
    expect(summarize(["other"]).rate).toBeNull();
    expect(formatRate(null)).toBe("–");
    expect(formatRate(0.756)).toBe("76%");
  });
});
