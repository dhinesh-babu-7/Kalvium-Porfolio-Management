import test from "node:test";
import assert from "node:assert/strict";

import { detectRapidSubmissions } from "./antiCheatService.js";

const baseTs = new Date("2026-09-01T10:00:00Z").getTime() / 1000;

function makeSubmission(id, secondsAfterStart, title = `Problem ${id}`, difficulty = "Easy") {
  return {
    id,
    titleSlug: title,
    timestamp: String(baseTs + secondsAfterStart),
    difficulty,
  };
}

test("detectRapidSubmissions flags under 2 minutes", () => {
  const result = detectRapidSubmissions([
    makeSubmission(1, 0, "Two Sum", "Easy"),
    makeSubmission(2, 90, "Valid Parentheses", "Easy"),
  ]);

  assert.equal(result.suspicious, true);
  assert.equal(result.severity, "low");
  assert.match(result.reason, /under 2 minutes|2 minutes/i);
});

test("detectRapidSubmissions flags multiple within 3 minutes", () => {
  const result = detectRapidSubmissions([
    makeSubmission(1, 0, "Two Sum", "Easy"),
    makeSubmission(2, 150, "Valid Parentheses", "Easy"),
  ]);

  assert.equal(result.suspicious, true);
  assert.equal(result.ruleTriggered, "multiple_submissions_within_3_minutes");
});

test("detectRapidSubmissions ignores gaps over 3 minutes", () => {
  const result = detectRapidSubmissions([
    makeSubmission(1, 0, "Two Sum", "Easy"),
    makeSubmission(2, 240, "Valid Parentheses", "Easy"),
  ]);

  assert.equal(result.suspicious, false);
});

test("detectRapidSubmissions escalates to high for repeated rapid pattern", () => {
  const submissions = [
    makeSubmission(1, 0, "A", "Easy"),
    makeSubmission(2, 60, "B", "Easy"),
    makeSubmission(3, 120, "C", "Easy"),
    makeSubmission(4, 180, "D", "Easy"),
    makeSubmission(5, 300, "E", "Easy"),
  ];

  const result = detectRapidSubmissions(submissions);
  assert.equal(result.suspicious, true);
  assert.equal(result.severity, "high");
});

test("detectRapidSubmissions keeps single legitimate solve as low severity suspicious signal", () => {
  const result = detectRapidSubmissions([
    makeSubmission(1, 0, "Two Sum", "Easy"),
    makeSubmission(2, 90, "Valid Parentheses", "Easy"),
  ]);

  assert.equal(result.severity, "low");
  assert.equal(result.suspicious, true);
});

test("detectRapidSubmissions ignores normal submissions", () => {
  const result = detectRapidSubmissions([
    makeSubmission(1, 0, "A", "Easy"),
    makeSubmission(2, 480, "B", "Easy"),
    makeSubmission(3, 1200, "C", "Easy"),
    makeSubmission(4, 2100, "D", "Easy"),
  ]);

  assert.equal(result.suspicious, false);
});
