/**
 * Server-side check of the partner verification codes used at signup.
 *
 * The signup form validates these in the browser too, but that check is only
 * there to give immediate feedback — it decides nothing. This is the copy that
 * gates account creation, so calling the registration function directly with a
 * made-up code fails.
 *
 * The registry itself is shared with the client form so the two can never drift
 * apart; only the enforcement point differs.
 */

import { validateCompanyCode, validateInstituteCode, validateTeacherCode } from "../../lib/registry";

/**
 * @param {string} role     student | industry | academician | institution
 * @param {string} code     whatever the caller supplied
 * @returns {{valid: boolean, code?: string, message?: string}}
 */
export function validateRegistryCode(role, code) {
  // Students self-register; there is no partner code for them by design.
  if (role === "student") return { valid: true, code: null };

  const validator = {
    industry: validateCompanyCode,
    academician: validateTeacherCode,
    institution: validateInstituteCode,
  }[role];

  if (!validator) return { valid: false, message: "Unrecognised account type." };

  const result = validator(code);
  if (!result.valid) return { valid: false, message: result.message };
  return { valid: true, code: result.code, data: result.data };
}
