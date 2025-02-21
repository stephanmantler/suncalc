/*
(c) 2011-2015, Vladimir Agafonkin
SunCalc is a JavaScript library for calculating sun/moon position and light phases.
https://github.com/mourner/suncalc
*/
import tzLookup from './tzLookup.js';
import { DateTime } from 'luxon';
// const DateTime = luxon.DateTime;
// shortcuts for easier to read formulas
const PI = Math.PI;
const sin = Math.sin;
const cos = Math.cos;
const tan = Math.tan;
const asin = Math.asin;
const atan = Math.atan2;
const acos = Math.acos;
const rad = PI / 180;
// sun calculations are based on http://aa.quae.nl/en/reken/zonpositie.html formulas
// date/time constants and conversions
const dayMs = 1000 * 60 * 60 * 24;
const J1970 = 2440588;
const J2000 = 2451545;
function toJulian(date) { return date.valueOf() / dayMs - 0.5 + J1970; }
function fromJulian(j) { return DateTime.fromMillis((j + 0.5 - J1970) * dayMs, { zone: "utc" }); }
function toDays(date) { return toJulian(date) - J2000; }
// general calculations for position
const e = rad * 23.4397; // obliquity of the Earth
function rightAscension(l, b) { return atan(sin(l) * cos(e) - tan(b) * sin(e), cos(l)); }
function declination(l, b) { return asin(sin(b) * cos(e) + cos(b) * sin(e) * sin(l)); }
function azimuth(H, phi, dec) { return atan(sin(H), cos(H) * sin(phi) - tan(dec) * cos(phi)); }
function altitude(H, phi, dec) { return asin(sin(phi) * sin(dec) + cos(phi) * cos(dec) * cos(H)); }
function siderealTime(d, lw) { return rad * (280.16 + 360.9856235 * d) - lw; }
function astroRefraction(h) {
    if (h < 0) // the following formula works for positive altitudes only.
        h = 0; // if h = -0.08901179 a div/0 would occur.
    // formula 16.4 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
    // 1.02 / tan(h + 10.26 / (h + 5.10)) h in degrees, result in arc minutes -> converted to rad:
    return 0.0002967 / Math.tan(h + 0.00312536 / (h + 0.08901179));
}
// general sun calculations
function solarMeanAnomaly(d) {
    return rad * (357.5291 + 0.98560028 * d);
}
function eclipticLongitude(M) {
    const C = rad * (1.9148 * sin(M) + 0.02 * sin(2 * M) + 0.0003 * sin(3 * M)), // equation of center
    P = rad * 102.9372; // perihelion of the Earth
    return M + C + P + PI;
}
function sunCoords(d) {
    const M = solarMeanAnomaly(d), L = eclipticLongitude(M);
    return {
        dec: declination(L, 0),
        ra: rightAscension(L, 0)
    };
}
// moon calculations, based on http://aa.quae.nl/en/reken/hemelpositie.html formulas
function moonCoords(d) {
    const L = rad * (218.316 + 13.176396 * d), // ecliptic longitude
    M = rad * (134.963 + 13.064993 * d), // mean anomaly
    F = rad * (93.272 + 13.229350 * d), // mean distance
    l = L + rad * 6.289 * sin(M), // longitude
    b = rad * 5.128 * sin(F), // latitude
    dt = 385001 - 20905 * cos(M); // distance to the moon in km
    return {
        ra: rightAscension(l, b),
        dec: declination(l, b),
        dist: dt
    };
}
const J0 = 0.0009;
function julianCycle(d, lw) { return Math.round(d - J0 - lw / (2 * PI)); }
function approxTransit(Ht, lw, n) { return J0 + (Ht + lw) / (2 * PI) + n; }
function solarTransitJ(ds, M, L) { return J2000 + ds + 0.0053 * sin(M) - 0.0069 * sin(2 * L); }
function hourAngle(h, phi, d) { return acos((sin(h) - sin(phi) * sin(d)) / (cos(phi) * cos(d))); }
function observerAngle(height) { return -2.076 * Math.sqrt(height) / 60; }
// returns set time for the given sun altitude
function getSetJ(h, lw, phi, dec, n, M, L) {
    const w = hourAngle(h, phi, dec);
    const a = approxTransit(w, lw, n);
    return solarTransitJ(a, M, L);
}
function hoursLater(date, h) {
    return date.plus({ hours: h });
}
class AziAlt {
    altitude;
    azimuth;
}
class SunCalc {
    // calculates sun position for a given date and latitude/longitude
    getPosition(date, lat, lng) {
        const lw = rad * -lng, phi = rad * lat, d = toDays(date), c = sunCoords(d), H = siderealTime(d, lw) - c.ra;
        return {
            azimuth: azimuth(H, phi, c.dec),
            altitude: altitude(H, phi, c.dec)
        };
    }
    // sun times configuration (angle, morning name, evening name)
    times = [
        [-0.833, 'sunrise', 'sunset'],
        [-0.3, 'sunriseEnd', 'sunsetStart'],
        [-6, 'dawn', 'dusk'],
        [-12, 'nauticalDawn', 'nauticalDusk'],
        [-18, 'nightEnd', 'night'],
        [6, 'goldenHourEnd', 'goldenHour']
    ];
    // adds a custom time to the times config
    addTime(angle, riseName, setName) {
        this.times.push([angle, riseName, setName]);
    }
    // calculations for sun times
    tzLookup(lat, lng) {
        return tzLookup(lat, lng);
    }
    // calculates sun times for a given date, latitude/longitude, and, optionally,
    // the observer height (in meters) relative to the horizon
    getTimes(date, lat, lng, height) {
        const tz = tzLookup(lat, lng);
        height = height || 0;
        const lw = rad * -lng;
        const phi = rad * lat;
        const dh = observerAngle(height);
        const d = toDays(date);
        const n = julianCycle(d, lw);
        const ds = approxTransit(0, lw, n);
        const M = solarMeanAnomaly(ds);
        const L = eclipticLongitude(M);
        const dec = declination(L, 0);
        const Jnoon = solarTransitJ(ds, M, L);
        let i, len, time, h0, Jset, Jrise;
        const result = {
            solarNoon: fromJulian(Jnoon),
            nadir: fromJulian(Jnoon - 0.5)
        };
        for (i = 0, len = this.times.length; i < len; i += 1) {
            time = this.times[i];
            h0 = (time[0] + dh) * rad;
            Jset = getSetJ(h0, lw, phi, dec, n, M, L);
            Jrise = Jnoon - (Jset - Jnoon);
            // result times are in UTC at this point.
            result[time[1]] = fromJulian(Jrise);
            result[time[2]] = fromJulian(Jset);
        }
        // Convert dates to the time at lat/lng
        for (const time in result) {
            // don't try to convert results that are invalid
            if (!result[time].isValid) {
                continue;
            }
            const options = { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' };
            try {
                // shift from UTC to destination time zone
                const newTime = result[time].setZone(tz);
                if (!newTime.isValid) {
                    throw new Error(`New time "${newTime}" is invalid. Old time: "${time}". DateTimeFormat options: ${JSON.stringify(options)}`);
                }
                else {
                    result[time] = newTime;
                }
            }
            catch (e) {
                console.error(`ERROR: Failed to convert time "${time}" at timezone "${tz}"`, e);
            }
        }
        return result;
    }
    getMoonPosition(date, lat, lng) {
        const lw = rad * -lng;
        const phi = rad * lat;
        const d = toDays(date);
        const c = moonCoords(d);
        const H = siderealTime(d, lw) - c.ra;
        let h = altitude(H, phi, c.dec);
        // formula 14.1 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
        const pa = atan(sin(H), tan(phi) * cos(c.dec) - sin(c.dec) * cos(H));
        h = h + astroRefraction(h); // altitude correction for refraction
        return {
            azimuth: azimuth(H, phi, c.dec),
            altitude: h,
            distance: c.dist,
            parallacticAngle: pa
        };
    }
    // calculations for illumination parameters of the moon,
    // based on http://idlastro.gsfc.nasa.gov/ftp/pro/astro/mphase.pro formulas and
    // Chapter 48 of "Astronomical Algorithms" 2nd edition by Jean Meeus (Willmann-Bell, Richmond) 1998.
    getMoonIllumination(date) {
        const d = toDays(date || DateTime.now());
        const s = sunCoords(d);
        const m = moonCoords(d);
        const sdist = 149598000; // distance from Earth to Sun in km
        const phi = acos(sin(s.dec) * sin(m.dec) + cos(s.dec) * cos(m.dec) * cos(s.ra - m.ra));
        const inc = atan(sdist * sin(phi), m.dist - sdist * cos(phi));
        const angle = atan(cos(s.dec) * sin(s.ra - m.ra), sin(s.dec) * cos(m.dec) - cos(s.dec) * sin(m.dec) * cos(s.ra - m.ra));
        return {
            fraction: (1 + cos(inc)) / 2,
            phase: 0.5 + 0.5 * inc * (angle < 0 ? -1 : 1) / Math.PI,
            angle: angle
        };
    }
    // calculations for moon rise/set times are based on http://www.stargazing.net/kepler/moonrise.html article
    getMoonTimes(date, lat, lng, inUTC) {
        let t = date;
        if (inUTC) {
            const tz = t.zone;
            t = t.setZone("utc").set({ hour: 0, minute: 0, second: 0, millisecond: 0 }).setZone(tz);
        }
        else
            t = t.set({ hour: 0, minute: 0, second: 0, millisecond: 0 });
        const hc = 0.133 * rad;
        let h0 = this.getMoonPosition(t, lat, lng).altitude - hc;
        let h1, h2, rise, set, a, b, xe, ye, d, roots, x1, x2, dx;
        // go in 2-hour chunks, each time seeing if a 3-point quadratic curve crosses zero (which means rise or set)
        for (let k = 1; k <= 24; k += 2) {
            h1 = this.getMoonPosition(hoursLater(t, k), lat, lng).altitude - hc;
            h2 = this.getMoonPosition(hoursLater(t, k + 1), lat, lng).altitude - hc;
            a = (h0 + h2) / 2 - h1;
            b = (h2 - h0) / 2;
            xe = -b / (2 * a);
            ye = (a * xe + b) * xe + h1;
            d = b * b - 4 * a * h1;
            roots = 0;
            if (d >= 0) {
                dx = Math.sqrt(d) / (Math.abs(a) * 2);
                x1 = xe - dx;
                x2 = xe + dx;
                if (Math.abs(x1) <= 1)
                    roots++;
                if (Math.abs(x2) <= 1)
                    roots++;
                if (x1 < -1)
                    x1 = x2;
            }
            if (roots === 1) {
                if (h0 < 0)
                    rise = k + x1;
                else
                    set = k + x1;
            }
            else if (roots === 2) {
                rise = k + (ye < 0 ? x2 : x1);
                set = k + (ye < 0 ? x1 : x2);
            }
            if (rise && set)
                break;
            h0 = h2;
        }
        const result = {};
        if (rise)
            result['rise'] = hoursLater(t, rise);
        if (set)
            result['set'] = hoursLater(t, set);
        if (!rise && !set)
            result[ye > 0 ? 'alwaysUp' : 'alwaysDown'] = true;
        return result;
    }
}
export default new SunCalc;
//  if (typeof exports === 'object' && typeof module !== 'undefined') {
//} else if (typeof define === 'function' && define.amd) {
//  define(SunCalc)
