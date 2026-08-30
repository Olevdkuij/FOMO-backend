const express = require('express');
const MarbellaEvent = require('../models/MarbellaEvent');
const RecurringNight = require('../models/RecurringNight');
const MarbellaWatchlistEntry = require('../models/MarbellaWatchlistEntry');
const InstagramLead = require('../models/InstagramLead');
const { requireSyncSecret } = require('../middleware/syncAuth');

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// --- Ingest -----------------------------------------------------------
// POST /api/marbella-events/sync
// Body: the full JSON dataset the external research pipeline produces.
// Pushed manually via sync_client.py whenever a fresh dataset is ready —
// this endpoint is never called on a schedule from inside this app.
router.post('/sync', requireSyncSecret, async (req, res) => {
  const payload = req.body || {};

  // events: upsert by the pipeline's stable id, then prune anything that's
  // either gone stale (date in the past) or wasn't part of this sync (no
  // longer confirmed) — mirrors the reference Postgres implementation's
  // upsert-then-prune, just expressed as Mongo calls.
  const events = Array.isArray(payload.events) ? payload.events : [];
  for (const e of events) {
    if (!e.id || !e.date || !e.venue) continue; // skip malformed entries rather than failing the whole sync
    await MarbellaEvent.findByIdAndUpdate(
      e.id,
      {
        _id: e.id,
        date: e.date,
        dayOfWeek: e.day_of_week || undefined,
        startTime: e.start_time || undefined,
        endTime: e.end_time || undefined,
        timeConfidence: e.time_confidence || undefined,
        venue: e.venue,
        venueArea: e.venue_area || undefined,
        address: e.address || undefined,
        djOrArtist: e.dj_or_artist || undefined,
        eventName: e.event_name || undefined,
        type: e.type || undefined,
        genre: e.genre || undefined,
        dressCode: e.dress_code || undefined,
        ageRestriction: e.age_restriction || undefined,
        ticketPrice: e.ticket_price || undefined,
        ticketUrl: e.ticket_url || undefined,
        description: e.description || undefined,
        sourceName: e.source_name || undefined,
        sourceUrl: e.source_url || undefined,
        verifiedAt: e.verified_at || undefined,
        note: e.note_on_day || e.note || undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  const keepIds = events.map((e) => e.id).filter(Boolean);
  // Only prune upcoming/today events that dropped out of this sync — past
  // events are kept forever so the calendar stays browsable in both
  // directions (see GET / below).
  await MarbellaEvent.deleteMany({
    date: { $gte: todayStr() },
    _id: { $nin: keepIds },
  });

  // recurring_nights / watchlist / instagram_leads carry no stable id in the
  // source data, and each sync is meant to be treated as a fresh,
  // manually-verified snapshot rather than an incremental diff — so the
  // simplest correct thing is to replace each collection wholesale.
  const recurringNights = Array.isArray(payload.recurring_nights) ? payload.recurring_nights : [];
  await RecurringNight.deleteMany({});
  if (recurringNights.length) {
    await RecurringNight.insertMany(recurringNights.map((r) => ({
      venue: r.venue,
      venueArea: r.venue_area || undefined,
      address: r.address || undefined,
      dayOfWeek: r.day_of_week,
      startTime: r.start_time || undefined,
      endTime: r.end_time || undefined,
      time: r.time || undefined, // legacy combined-string shape, kept as a fallback
      seriesName: r.series_name,
      djOrArtist: r.dj_or_artist || undefined,
      genre: r.genre || undefined,
      description: r.description || undefined,
      runsThrough: r.runs_through || undefined,
      sourceUrl: r.source_url || undefined,
      verifiedAt: r.verified_at || undefined,
    })));
  }

  const watchlist = Array.isArray(payload.watchlist) ? payload.watchlist : [];
  await MarbellaWatchlistEntry.deleteMany({});
  if (watchlist.length) {
    await MarbellaWatchlistEntry.insertMany(watchlist.map((w) => ({
      venue: w.venue,
      venueArea: w.venue_area || undefined,
      seriesName: w.series_name || undefined,
      artistsAnnounced: w.artists_announced || [],
      genre: w.genre || undefined,
      status: w.status || undefined,
      sourceUrl: w.source_url || undefined,
      verifiedAt: w.verified_at || undefined,
    })));
  }

  const instagramLeads = Array.isArray(payload.instagram_leads) ? payload.instagram_leads : [];
  await InstagramLead.deleteMany({});
  if (instagramLeads.length) {
    await InstagramLead.insertMany(instagramLeads.map((l) => ({
      venue: l.venue,
      claimedDate: l.claimed_date || undefined,
      claimedDjOrEvent: l.claimed_dj_or_event || undefined,
      snippetText: l.snippet_text || undefined,
      sourceUrl: l.source_url || undefined,
      foundAt: l.found_at || undefined,
      confidence: l.confidence || 'unverified',
    })));
  }

  res.json({
    ok: true,
    events_synced: events.length,
    recurring_nights_synced: recurringNights.length,
    watchlist_synced: watchlist.length,
    instagram_leads_synced: instagramLeads.length,
  });
});

// --- Read ---------------------------------------------------------------
// GET /api/marbella-events — public, like /api/venues. Powers the app's
// "What's On" screen.
router.get('/', async (req, res) => {
  const [events, recurringNights, watchlist, instagramLeads] = await Promise.all([
    // No date filter — past events are kept so the app can show what
    // already happened on a given night, not just what's upcoming.
    MarbellaEvent.find({}).sort({ date: 1 }),
    RecurringNight.find().sort({ dayOfWeek: 1 }),
    MarbellaWatchlistEntry.find().sort({ venue: 1 }),
    InstagramLead.find({ $or: [{ claimedDate: null }, { claimedDate: { $gte: todayStr() } }] }).sort({ foundAt: -1 }),
  ]);
  res.json({
    events: events.map((e) => ({ ...e.toObject(), id: e._id })),
    recurringNights: recurringNights.map((r) => ({ ...r.toObject(), id: r._id })),
    watchlist: watchlist.map((w) => ({ ...w.toObject(), id: w._id })),
    instagramLeads: instagramLeads.map((l) => ({ ...l.toObject(), id: l._id })),
  });
});

module.exports = router;
