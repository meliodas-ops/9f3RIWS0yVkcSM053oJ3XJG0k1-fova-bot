// All "calendar day" logic is centralized here, pinned to Europe/Warsaw.
const TZ = 'Europe/Warsaw';

/**
 * Returns YYYY-MM-DD for a given Date in Europe/Warsaw.
 * Use this as the "day key" for streaks and daily counters.
 */
function dayKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TZ,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(date); // en-CA gives YYYY-MM-DD
}

/**
 * Number of whole calendar days between two day keys.
 * dayKey('2026-11-10') -> dayKey('2026-11-13') === 3
 */
function daysBetween(a, b) {
    const [ya, ma, da] = a.split('-').map(Number);
    const [yb, mb, db] = b.split('-').map(Number);
    const t1 = Date.UTC(ya, ma - 1, da);
    const t2 = Date.UTC(yb, mb - 1, db);
    return Math.round((t2 - t1) / 86400000);
}

/** Milliseconds until the next 00:00 in Europe/Warsaw. */
function msUntilMidnight() {
    const now = new Date();
    // Find the Warsaw wall-clock time, then compute "tomorrow 00:00 Warsaw" as UTC.
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const [h, m, s] = fmt.format(now).split(':').map(Number);
    const elapsedMs = ((h * 3600) + (m * 60) + s) * 1000 + now.getMilliseconds();
    return 86400000 - elapsedMs;
}

/** Milliseconds until a specific Warsaw wall-clock time today (or tomorrow if passed). */
function msUntilWarsawTime(hour, minute = 0) {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    const [h, m, s] = fmt.format(now).split(':').map(Number);
    const nowSec = h * 3600 + m * 60 + s;
    const targetSec = hour * 3600 + minute * 60;
    let diffSec = targetSec - nowSec;
    if (diffSec <= 0) diffSec += 86400;
    return diffSec * 1000 - now.getMilliseconds();
}

module.exports = { TZ, dayKey, daysBetween, msUntilMidnight, msUntilWarsawTime };