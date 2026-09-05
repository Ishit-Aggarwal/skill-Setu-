import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { authError, requireActor } from "./_lib/authz";

/**
 * Office hours and mentorship bookings.
 *
 * These moved off browser storage because they are inherently two-sided: a
 * slot published by a mentor on their laptop has to be bookable by a student on
 * their phone. Held locally, the student half could only ever see slots that
 * the same browser had written.
 *
 * Authorization is per row, not per role: only the slot's own mentor may edit
 * or withdraw it, and only the student who made a booking may cancel it (the
 * mentor may cancel bookings on their own slots, which is a different thing).
 */

const MENTOR_ROLES = ["academician", "institution", "industry", "admin"];

function normaliseSlot(doc) {
  return {
    ...doc,
    id: doc.id || doc._id,
    durationMins: doc.durationMins || 30,
    capacity: doc.capacity || 1,
    title: doc.title || "Office hours",
    mode: doc.mode || "In person",
  };
}

async function slotById(ctx, slotId) {
  const byCustom = await ctx.db
    .query("officeHours")
    .filter((q) => q.eq(q.field("id"), slotId))
    .first();
  if (byCustom) return byCustom;
  try {
    return await ctx.db.get(slotId);
  } catch {
    return null;
  }
}

async function bookingsForSlot(ctx, slotId) {
  return await ctx.db
    .query("mentorBookings")
    .withIndex("by_slot", (q) => q.eq("slotId", slotId))
    .collect();
}

function activeBookings(bookings) {
  return bookings.filter((b) => b.status !== "Cancelled");
}

/* ============================================================
   Mentor side
   ============================================================ */

/** Every slot you have published, with its attendees attached. */
export const mySlots = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const slots = await ctx.db
      .query("officeHours")
      .withIndex("by_faculty", (q) => q.eq("facultyId", actor.id))
      .collect();

    const rows = [];
    for (const slot of slots) {
      const bookings = await bookingsForSlot(ctx, slot.id || slot._id);
      rows.push({ ...normaliseSlot(slot), bookings });
    }
    return rows.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
  },
});

export const publishSlot = mutation({
  args: {
    sessionToken: v.string(),
    slot: v.string(), // ISO-ish "YYYY-MM-DDTHH:mm" local wall time
    title: v.optional(v.string()),
    durationMins: v.optional(v.number()),
    capacity: v.optional(v.number()),
    mode: v.optional(v.string()),
    location: v.optional(v.string()),
    meetingUrl: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!MENTOR_ROLES.includes(actor.role)) {
      throw authError("Only a faculty or organisation account can publish office hours.");
    }
    if (!args.slot) throw new Error("A date and time is required.");
    if (args.mode === "Online" && args.meetingUrl && !/^https?:\/\//i.test(args.meetingUrl)) {
      throw new Error("The meeting link must start with http:// or https://");
    }

    const id = `oh_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await ctx.db.insert("officeHours", {
      id,
      facultyId: actor.id,
      slot: args.slot,
      title: (args.title || "").trim() || "Office hours",
      durationMins: Math.max(10, Math.min(240, args.durationMins || 30)),
      capacity: Math.max(1, Math.min(50, args.capacity || 1)),
      mode: args.mode || "In person",
      location: args.location || "",
      meetingUrl: args.mode === "Online" ? args.meetingUrl || "" : "",
      notes: args.notes || "",
      createdAt: new Date().toISOString(),
    });
    return { ok: true, id };
  },
});

export const updateSlot = mutation({
  args: {
    sessionToken: v.string(),
    slotId: v.string(),
    patch: v.any(),
  },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const slot = await slotById(ctx, args.slotId);
    if (!slot) throw new Error("That slot no longer exists.");
    if (slot.facultyId !== actor.id && actor.role !== "admin") {
      throw authError("Only the mentor who published this slot can change it.");
    }

    const { facultyId, id, _id, _creationTime, ...safe } = args.patch || {};
    if (safe.capacity != null) {
      const booked = activeBookings(await bookingsForSlot(ctx, args.slotId)).length;
      if (safe.capacity < booked) {
        throw new Error(`This slot already has ${booked} booking${booked === 1 ? "" : "s"} — capacity cannot go below that.`);
      }
    }
    await ctx.db.patch(slot._id, safe);
    return { ok: true };
  },
});

/** Withdrawing a slot cancels its bookings rather than deleting them silently. */
export const withdrawSlot = mutation({
  args: { sessionToken: v.string(), slotId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const slot = await slotById(ctx, args.slotId);
    if (!slot) return { ok: false, reason: "NOT_FOUND" };
    if (slot.facultyId !== actor.id && actor.role !== "admin") {
      throw authError("Only the mentor who published this slot can withdraw it.");
    }

    for (const booking of await bookingsForSlot(ctx, args.slotId)) {
      await ctx.db.delete(booking._id);
      await ctx.db.insert("studentNotifications", {
        studentId: booking.studentId,
        message: `Your mentoring session on ${slot.slot} was withdrawn by the mentor.`,
        from: actor.user.name || "Your mentor",
        sentAt: new Date().toISOString(),
        read: false,
      });
    }
    await ctx.db.delete(slot._id);
    return { ok: true };
  },
});

export const setBookingStatus = mutation({
  args: { sessionToken: v.string(), bookingId: v.string(), status: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (!["Booked", "Completed", "No show", "Cancelled"].includes(args.status)) {
      throw new Error("Unrecognised booking status.");
    }

    const booking = await ctx.db
      .query("mentorBookings")
      .filter((q) => q.eq(q.field("id"), args.bookingId))
      .first();
    const doc = booking || (await ctx.db.get(args.bookingId).catch(() => null));
    if (!doc) throw new Error("That booking no longer exists.");

    const isMentor = doc.facultyId === actor.id;
    const isStudent = doc.studentId === actor.id;
    if (!isMentor && !isStudent && actor.role !== "admin") {
      throw authError("You are not part of this booking.");
    }
    // A student can only cancel; marking attendance is the mentor's call.
    if (isStudent && !isMentor && args.status !== "Cancelled") {
      throw authError("You can only cancel your own booking.");
    }

    await ctx.db.patch(doc._id, { status: args.status });
    return { ok: true };
  },
});

/* ============================================================
   Student side
   ============================================================ */

/** Open slots the signed-in student can book, plus the ones they already hold. */
export const availableForStudent = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const institution = actor.user.institution || actor.user.instituteName;

    const mentors = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "academician"))
      .collect();
    const eligible = mentors.filter((m) => !institution || m.institution === institution);
    const mentorById = new Map(eligible.map((m) => [m.id, m]));

    const rows = [];
    for (const mentor of eligible) {
      const slots = await ctx.db
        .query("officeHours")
        .withIndex("by_faculty", (q) => q.eq("facultyId", mentor.id))
        .collect();
      for (const slot of slots) {
        const bookings = activeBookings(await bookingsForSlot(ctx, slot.id || slot._id));
        const mine = bookings.find((b) => b.studentId === actor.id) || null;
        rows.push({
          ...normaliseSlot(slot),
          mentorName: mentor.name,
          mentorDepartment: mentor.department,
          mentorDesignation: mentor.designation,
          booked: bookings.length,
          remaining: Math.max(0, (slot.capacity || 1) - bookings.length),
          myBooking: mine,
          // Meeting links are only shown to someone who actually holds a place.
          meetingUrl: mine ? slot.meetingUrl || "" : "",
        });
      }
    }
    void mentorById;
    return rows.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
  },
});

export const bookSlot = mutation({
  args: { sessionToken: v.string(), slotId: v.string(), topic: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    if (actor.role !== "student") throw authError("Only student accounts can book mentoring slots.");

    const slot = await slotById(ctx, args.slotId);
    if (!slot) throw new Error("That slot no longer exists.");

    const bookings = activeBookings(await bookingsForSlot(ctx, args.slotId));
    if (bookings.some((b) => b.studentId === actor.id)) {
      return { ok: true, alreadyBooked: true };
    }
    if (bookings.length >= (slot.capacity || 1)) throw new Error("That slot is already full.");

    const id = `mb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    await ctx.db.insert("mentorBookings", {
      id,
      slotId: args.slotId,
      facultyId: slot.facultyId,
      studentId: actor.id,
      studentName: actor.user.name || "Student",
      topic: (args.topic || "").trim(),
      status: "Booked",
      bookedAt: new Date().toISOString(),
    });
    return { ok: true, id };
  },
});

/** A student cancelling their own place — never anybody else's. */
export const cancelMyBooking = mutation({
  args: { sessionToken: v.string(), slotId: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const booking = (await bookingsForSlot(ctx, args.slotId)).find((b) => b.studentId === actor.id);
    if (!booking) return { ok: false, reason: "NOT_FOUND" };
    await ctx.db.delete(booking._id);
    return { ok: true };
  },
});

/** The student's own upcoming and past sessions, with full detail. */
export const myBookings = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const actor = await requireActor(ctx, args.sessionToken);
    const bookings = await ctx.db
      .query("mentorBookings")
      .withIndex("by_student", (q) => q.eq("studentId", actor.id))
      .collect();

    const rows = [];
    for (const booking of bookings) {
      const slot = await slotById(ctx, booking.slotId);
      const mentor = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("id"), booking.facultyId))
        .first();
      if (!slot) continue;
      rows.push({
        ...normaliseSlot(slot),
        booking,
        mentorName: mentor?.name || "Mentor",
        mentorDepartment: mentor?.department || "",
        mentorEmail: mentor?.email || "",
      });
    }
    return rows.sort((a, b) => String(a.slot).localeCompare(String(b.slot)));
  },
});
