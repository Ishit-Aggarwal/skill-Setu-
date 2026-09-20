import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveInstitutionAccount, resolveInstitutionId, resolveInstitutionIdForName } from "../lib/institutionKey.js";

const accounts = [
  { id: "inst_a", role: "institution", instituteName: "All India Institute of Ayurveda (AIIA), New Delhi", instituteId: "AISHE-U-0842" },
  { id: "inst_b", role: "institution", instituteName: "National Institute of Ayurveda (NIA), Jaipur", instituteId: "AISHE-U-0100" },
  { id: "not_inst", role: "industry", instituteName: "All India Institute of Ayurveda (AIIA), New Delhi" },
];

test("matches by name, trimmed and case-insensitively", () => {
  const student = { role: "student", institution: "  all india institute of ayurveda (aiia), new delhi " };
  assert.equal(resolveInstitutionAccount(student, accounts).account.id, "inst_a");
  assert.equal(resolveInstitutionId(student, accounts), "inst_a");
});

test("matches by AISHE id when the student carries one", () => {
  const student = { role: "student", institution: "typo college", instituteId: "aishe-u-0100" };
  assert.equal(resolveInstitutionId(student, accounts), "inst_b");
});

test("two name matches: prefer the AISHE match, else fail closed", () => {
  const twins = [
    { id: "t1", role: "institution", instituteName: "Same Name College", instituteId: "A-1" },
    { id: "t2", role: "institution", instituteName: "Same Name College", instituteId: "A-2" },
  ];
  assert.equal(resolveInstitutionId({ role: "student", institution: "Same Name College", instituteId: "A-2" }, twins), "t2");
  const ambiguous = resolveInstitutionAccount({ role: "student", institution: "Same Name College" }, twins);
  assert.equal(ambiguous.account, null);
  assert.equal(ambiguous.ambiguous, true);
});

test("an institution account is its own key; no match is null", () => {
  assert.equal(resolveInstitutionId({ role: "institution", id: "inst_a" }, []), "inst_a");
  assert.equal(resolveInstitutionId({ role: "student", institution: "Nowhere" }, accounts), null);
  assert.equal(resolveInstitutionIdForName("national institute of ayurveda (nia), jaipur", accounts), "inst_b");
  assert.equal(resolveInstitutionIdForName("", accounts), null);
});
