import assert from "node:assert/strict";
import { test } from "node:test";
import { extractAgentText, extractPayloadText } from "./extract-agent-text.js";

test("extractPayloadText joins visible payload text", () => {
  assert.equal(extractPayloadText([{ text: " hello " }, { content: "world" }]), "hello\n\nworld");
});

test("extractAgentText prefers top-level payload text", () => {
  assert.equal(extractAgentText(JSON.stringify({ payloads: [{ text: "hello" }] })), "hello");
});

test("extractAgentText reads nested result payloads", () => {
  assert.equal(extractAgentText(JSON.stringify({ result: { payloads: [{ message: "nested" }] } })), "nested");
});

test("extractAgentText reads final visible text fallback", () => {
  assert.equal(extractAgentText(JSON.stringify({ finalAssistantVisibleText: "visible" })), "visible");
});

test("extractAgentText does not relay raw JSON metadata", () => {
  assert.equal(extractAgentText(JSON.stringify({ payloads: [], meta: { ok: true } })), "");
});

test("extractAgentText returns plain non-JSON stdout", () => {
  assert.equal(extractAgentText(" plain reply "), "plain reply");
});

test("extractAgentText reads the last visible JSONL reply", () => {
  const stdout = [
    JSON.stringify({ payloads: [{ text: "first" }] }),
    "diagnostic line",
    JSON.stringify({ result: { payloads: [{ text: "second" }] } }),
  ].join("\n");
  assert.equal(extractAgentText(stdout), "second");
});

test("extractAgentText suppresses silent reply sentinel", () => {
  assert.equal(extractAgentText("NO_REPLY"), "");
  assert.equal(extractAgentText(JSON.stringify({ payloads: [{ text: "NO_REPLY" }] })), "");
});

test("extractAgentText does not relay mixed JSON metadata", () => {
  const stdout = `${JSON.stringify({ meta: { ok: true } })}\nplain tail`;
  assert.equal(extractAgentText(stdout), "");
});
