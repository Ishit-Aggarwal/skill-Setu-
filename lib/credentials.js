/**
 * The kinds of certificate a partner may issue to a student. Shared by the
 * browser (the issue dialog) and the Convex mutation that validates them, so
 * the two can never disagree.
 */
export const CREDENTIAL_KINDS = ["Skill Test", "Internship", "Training", "Merit", "Participation"];

export function isCredentialKind(value) {
  return CREDENTIAL_KINDS.includes(value);
}
