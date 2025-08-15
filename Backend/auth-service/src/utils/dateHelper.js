// utils/dateHelper.js
/**
 * Returns the current timestamp in the given IANA zone,
 * formatted as “YYYY‑MM‑DD HH:mm:ss” (Postgres‑friendly).
 */
function getPresentDateAndTime(timeZone = 'Asia/Kolkata') {
  // first get a locale string in that zone…
  const local = new Date().toLocaleString('en-GB', {
    timeZone,
    hour12: false,
    year:   'numeric',
    month:  '2-digit',
    day:    '2-digit',
    hour:   '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  // local is e.g. “31/07/2025, 14:05:09” so swap slashes→dashes & comma
  const [d,m,y, hms] = local.replace(',', '').split(/[\/ ]/);
  return `${y}-${m}-${d} ${hms}`;
}

module.exports = { getPresentDateAndTime };
