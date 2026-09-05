"use client";

/**
 * Office hours, from whichever side of the desk you are on.
 *
 * Before this, both mentorship screens talked to Convex directly and, if there
 * was no session or no deployment URL, rendered a dead end that read
 * "Scheduling needs the shared database … a deployment that has
 * NEXT_PUBLIC_CONVEX_URL configured". That is an internal deployment note
 * shown to a student who wanted to book fifteen minutes with their tutor. It
 * named an environment variable, it blamed the reader, and it turned a whole
 * feature off rather than degrading.
 *
 * So scheduling now has two backends behind one API:
 *
 *   • Shared — Convex, whenever the deployment is configured and the caller is
 *     signed in. Genuinely two-sided: a slot published on a laptop is bookable
 *     from a phone.
 *   • On this device — the local store, otherwise. Everything works: publish,
 *     book, cancel, mark attendance. It simply doesn't leave the browser, which
 *     is exactly right for demo mode and for being offline.
 *
 * Screens ask `schedulingMode()` only to caption *where* the data lives. They
 * never have to handle "unavailable", because it no longer exists.
 */

import { api } from "../convex/_generated/api";
import { backendMutation, backendQuery, isBackendConfigured } from "./convexBrowser";
import { getSessionToken } from "./session";
import {
  addOfficeHourSlot,
  bookOfficeHourSlot,
  findMany,
  findOne,
  listBookingsForSlot,
  listOfficeHours,
  listUsersByRole,
  remove,
  removeOfficeHourSlot,
  setBookingStatus,
  update,
  notifyStudent,
} from "./store";

export const SHARED = "shared";
export const LOCAL = "local";

export function schedulingMode() {
  return isBackendConfigured() && getSessionToken() ? SHARED : LOCAL;
}

/** A one-line, non-technical caption for where these bookings live. */
export function schedulingModeNote(mode = schedulingMode()) {
  return mode === SHARED
    ? "Synced across your devices — students see these as soon as you publish them."
    : "Saved on this device. Sign in with a full account to share your calendar with students on theirs.";
}

function normalise(slot) {
  return {
    ...slot,
    id: slot.id || slot._id,
    title: slot.title || "Office hours",
    durationMins: slot.durationMins || 30,
    capacity: slot.capacity || 1,
    mode: slot.mode || "In person",
  };
}

function activeOnly(bookings) {
  return (bookings || []).filter((b) => b.status !== "Cancelled");
}

/* ============================================================
   Mentor side
   ============================================================ */

/** Every slot you publish, with its attendees attached. */
export async function loadMySlots(user) {
  if (schedulingMode() === SHARED) {
    const rows = await backendQuery(api.mentorship.mySlots, {});
    return (rows || []).map(normalise);
  }
  if (!user?.id) return [];
  return listOfficeHours(user.id)
    .map((slot) => ({ ...normalise(slot), bookings: listBookingsForSlot(slot.id) }))
    .sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
}

export async function publishSlot(user, form) {
  const payload = {
    slot: form.slot,
    title: (form.title || "").trim() || "Office hours",
    durationMins: Math.max(10, Math.min(240, Number(form.durationMins) || 30)),
    capacity: Math.max(1, Math.min(50, Number(form.capacity) || 1)),
    mode: form.mode || "In person",
    audience: form.audience || "all",
    location: form.mode === "Online" ? "" : form.location || "",
    meetingUrl: form.mode === "In person" ? "" : form.meetingUrl || "",
    notes: form.notes || "",
  };

  if (!payload.slot) throw new Error("Pick a date and time for the slot.");
  if (payload.meetingUrl && !/^https?:\/\//i.test(payload.meetingUrl)) {
    throw new Error("The meeting link must start with http:// or https://");
  }

  if (schedulingMode() === SHARED) {
    return await backendMutation(api.mentorship.publishSlot, payload);
  }
  return addOfficeHourSlot(user.id, { ...payload, linkPushCount: 0 });
}

export async function updateSlot(slotId, patch) {
  if (schedulingMode() === SHARED) {
    return await backendMutation(api.mentorship.updateSlot, { slotId, patch });
  }
  if (patch.capacity != null) {
    const booked = activeOnly(listBookingsForSlot(slotId)).length;
    if (patch.capacity < booked) {
      throw new Error(`This slot already has ${booked} booking${booked === 1 ? "" : "s"} — capacity cannot go below that.`);
    }
  }
  const updated = update("officeHours", slotId, patch);

  // Notify all booked students about the update
  const bookings = activeOnly(listBookingsForSlot(slotId));
  const slot = findOne("officeHours", (s) => s.id === slotId);
  bookings.forEach((b) => {
    if (b.studentId) {
      notifyStudent(
        b.studentId,
        `Mentorship session updated: "${patch.title || slot?.title || 'Office hours'}" details or schedule have been updated. Mode: ${patch.mode || slot?.mode || 'In person'}.`,
        slot?.mentorName || "Mentor",
        { slotId }
      );
    }
  });

  return updated;
}

export async function withdrawSlot(slotId) {
  if (schedulingMode() === SHARED) {
    return await backendMutation(api.mentorship.withdrawSlot, { slotId });
  }
  removeOfficeHourSlot(slotId);
  return { ok: true };
}

export async function updateBookingStatus(bookingId, status) {
  if (schedulingMode() === SHARED) {
    return await backendMutation(api.mentorship.setBookingStatus, { bookingId, status });
  }
  return setBookingStatus(bookingId, status);
}

/* ============================================================
   Student side
   ============================================================ */

/**
 * Slots the student can book. Supports both campus-specific and platform-wide
 * slots so students can take new mentorships across institutions.
 */
export async function loadAvailableSlots(user) {
  if (schedulingMode() === SHARED) {
    const rows = await backendQuery(api.mentorship.availableForStudent, {});
    return (rows || []).map(normalise);
  }

  const institution = user?.institution || user?.instituteName;
  const mentors = listUsersByRole("academician");

  return mentors
    .flatMap((mentor) =>
      listOfficeHours(mentor.id)
        .filter((slot) => {
          // If slot is restricted to institution only, filter by institution
          if (slot.audience === "institution" && institution && mentor.institution && mentor.institution !== institution) {
            return false;
          }
          return true;
        })
        .map((slot) => {
          const bookings = activeOnly(listBookingsForSlot(slot.id));
          const mine = bookings.find((b) => b.studentId === user?.id) || null;
          return {
            ...normalise(slot),
            mentorName: mentor.name,
            mentorDepartment: mentor.department,
            mentorDesignation: mentor.designation,
            mentorInstitution: mentor.institution,
            booked: bookings.length,
            remaining: Math.max(0, (slot.capacity || 1) - bookings.length),
            myBooking: mine,
            // The joining link is only for someone who actually holds a place.
            meetingUrl: mine ? slot.meetingUrl || "" : "",
          };
        })
    )
    .sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
}

/** The student's own sessions, past and upcoming. */
export async function loadMyBookings(user) {
  if (schedulingMode() === SHARED) {
    const rows = await backendQuery(api.mentorship.myBookings, {});
    return (rows || []).map(normalise);
  }
  if (!user?.id) return [];

  return findMany("mentorBookings", (b) => b.studentId === user.id)
    .map((booking) => {
      const slot = findOne("officeHours", (s) => s.id === booking.slotId);
      if (!slot) return null;
      const mentor = findOne("users", (u) => u.id === booking.facultyId);
      return {
        ...normalise(slot),
        booking,
        mentorName: mentor?.name || "Mentor",
        mentorDepartment: mentor?.department || "",
        mentorEmail: mentor?.email || "",
      };
    })
    .filter(Boolean)
    .sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
}

export async function bookSlot(user, slot, topic) {
  if (schedulingMode() === SHARED) {
    return await backendMutation(api.mentorship.bookSlot, { slotId: slot.id, topic });
  }
  return bookOfficeHourSlot(slot, { id: user.id, name: user.name }, topic);
}

export async function cancelMyBooking(user, slotId) {
  if (schedulingMode() === SHARED) {
    return await backendMutation(api.mentorship.cancelMyBooking, { slotId });
  }
  const booking = findOne("mentorBookings", (b) => b.slotId === slotId && b.studentId === user?.id);
  if (!booking) return { ok: false, reason: "NOT_FOUND" };
  remove("mentorBookings", booking.id);
  return { ok: true };
}
