import { describe, it, expect } from "vitest";
import { evaluate } from "../src/index";
import { at, loadContentJourney } from "./helpers";

describe("William of Rubruck's journey", () => {
  const journey = loadContentJourney("rubruck-1253");
  const snap = (iso: string) => evaluate(journey, at(iso));
  const friar = (iso: string) => snap(iso).tracks["friar-william"]!;

  it("lands at Soldaia in the Crimea on 21 May 1253", () => {
    const s = friar("1253-05-25T12:00:00Z");
    expect(s.position[0]).toBeCloseTo(34.98, 1);
    expect(s.position[1]).toBeCloseTo(44.85, 1);
    expect(s.isHalted).toBe(true);
  });

  it("is with Batu on the Volga in August and far to the east by November", () => {
    expect(friar("1253-08-20T12:00:00Z").position[0]).toBeCloseTo(46, 0);
    expect(friar("1253-11-20T12:00:00Z").position[0]).toBeCloseTo(80.26, 1);
  });

  it("reaches the khan's winter camp, not Karakorum, at the end of 1253", () => {
    const camp = friar("1254-01-02T06:00:00Z").position;
    expect(camp[1]).toBeLessThan(46.6);
    const karakorum = friar("1254-04-10T06:00:00Z").position;
    expect(karakorum[0]).toBeCloseTo(102.82, 1);
    expect(karakorum[1]).toBeCloseTo(47.2, 1);
  });

  it("counts his party down to three before the khan and up to 26 with an escort", () => {
    expect(friar("1254-02-01T06:00:00Z").stats.party).toBe(3);
    expect(friar("1254-11-14T06:00:00Z").stats.party).toBe(26);
  });

  it("keeps Christmas 1254 snowbound at Nakhichevan", () => {
    const s = friar("1254-12-25T09:00:00Z");
    expect(s.position[0]).toBeCloseTo(45.41, 1);
    expect(s.isHalted).toBe(true);
    expect(snap("1254-12-25T09:00:00Z").activity.key).toBe("camp");
  });

  it("ends at Tripoli", () => {
    const end = friar("1255-08-15T17:30:00Z").position;
    expect(end[0]).toBeCloseTo(35.83, 1);
    expect(end[1]).toBeCloseTo(34.44, 1);
  });
});
