import { getConvexClient, convexUnavailable } from "../../../lib/convexServer";
import { api } from "../../../convex/_generated/api";
import { forwardConvexError, readSessionToken, unauthorized } from "../../../lib/apiAuth";

/**
 * Account deletion.
 *
 * Previously this deleted whatever id it was handed. It now requires the
 * session behind the request to be that account (or an admin), and the Convex
 * mutation re-checks the same thing, so the route is not the only guard.
 * Deleting also clears the account's applications, portfolio, assessments and
 * bookings rather than orphaning them.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed. Please use POST." });
  }

  const sessionToken = readSessionToken(req);
  if (!sessionToken) return unauthorized(res);

  const { id } = req.body || {};
  if (!id || typeof id !== "string") {
    return res.status(400).json({ success: false, error: "A user id is required." });
  }

  const convex = getConvexClient();
  if (!convex) return convexUnavailable(res);

  try {
    const outcome = await convex.mutation(api.users.deleteUser, { sessionToken, id });
    return res.status(200).json({ success: Boolean(outcome?.ok) });
  } catch (error) {
    return forwardConvexError(res, error, {
      logPrefix: `[delete] Failed to delete account ${id}:`,
      message: "Could not delete the account.",
    });
  }
}
