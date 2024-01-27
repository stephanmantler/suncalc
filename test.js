import SunCalc from './build/suncalc.js'
import { DateTime } from 'luxon'
const Tape = await import('tape')

function near(val1, val2, margin) {
    return Math.abs(val1 - val2) < (margin || 1E-15)
}

const date = new Date('2013-03-05UTC')
const lat = 50.5
const lng = 30.5
const height = 2000
const testTimes = {
    solarNoon: '2013-03-05T10:10:57Z',
    nadir: '2013-03-04T22:10:57Z',
    sunrise: '2013-03-05T04:34:56Z',
    sunset: '2013-03-05T15:46:57Z',
    sunriseEnd: '2013-03-05T04:38:19Z',
    sunsetStart: '2013-03-05T15:43:34Z',
    dawn: '2013-03-05T04:02:17Z',
    dusk: '2013-03-05T16:19:36Z',
    nauticalDawn: '2013-03-05T03:24:31Z',
    nauticalDusk: '2013-03-05T16:57:22Z',
    nightEnd: '2013-03-05T02:46:17Z',
    night: '2013-03-05T17:35:36Z',
    goldenHourEnd: '2013-03-05T05:19:01Z',
    goldenHour: '2013-03-05T15:02:52Z'
}
const heightTestTimes = {
    solarNoon: '2013-03-05T10:10:57Z',
    nadir: '2013-03-04T22:10:57Z',
    sunrise: '2013-03-05T04:25:07Z',
    sunset: '2013-03-05T15:56:46Z'
}
const tzTestDate = new Date('2023-04-19UTC')
const tzTestLocations = {
    buenosaires: { lat: -36.30, lng: -60.00, offset: -3*60, sunrise: "07:28" },
    canberra: { lat: -35.15, lng: 149.08, offset: 10*60, sunrise: "06:31" },
    london: { lat: 51.36, lng: -0.05, offset: 1*60, sunrise: "06:00" },
    newyork: { lat: 40.71, lng: -74, offset: -4*60, sunrise: "06:14" },
    mogadishu: { lat: 2.02, lng: 45.25, offset: 3*60, sunrise: "05:54" },
    moscow: { lat: 55.45, lng: 37.35, offset: 3*60, sunrise: "05:19" },
    paris: { lat: 48.50, lng: 2.20, offset: 2*60, sunrise: "06:55" },
    reykjavik: { lat: 64.10, lng: -21.57, offset: 0, sunrise: "05:46" },
    tokyo: { lat: 35.68, lng: 139.65, offset: 9*60, sunrise: "05:05" }
}

Tape.test('getPosition returns azimuth and altitude for the given time and location', function (t) {
    var sunPos = SunCalc.getPosition(date, lat, lng)
    t.ok(near(sunPos.azimuth, -2.5003175907168385), 'azimuth')
    t.ok(near(sunPos.altitude, -0.7000406838781611), 'altitude')
    t.end()
})

Tape.test('getTimes returns sun phases for the given date and location', function (t) {
    var times = SunCalc.getTimes(date, lat, lng)
    for (var i in testTimes) {
        t.equal(times[i].toUTC().set({milliseconds: 0}).toISO(), DateTime.fromISO(testTimes[i]).toUTC().toISO(), i)
    }
    t.end()
})

Tape.test('getTimes adjusts sun phases when additionally given the observer height', function (t) {
    var times = SunCalc.getTimes(date, lat, lng, height)
    for (var i in heightTestTimes) {
        t.equal(times[i].toUTC().set({milliseconds: 0}).toISO(), DateTime.fromISO(heightTestTimes[i]).toUTC().toISO(), i)
    }
    t.end()
})

Tape.test('getTimes returns locally accurate times with correct time zones', function(t) {
    for(var i in tzTestLocations) {
        var l = tzTestLocations[i]
        var times = SunCalc.getTimes(tzTestDate, l.lat, l.lng)
        t.equal(times.sunrise.offset, l.offset, i)
        t.equal(times.sunrise.toFormat("HH:mm"), l.sunrise, i)
    }
    t.end()
})

Tape.test('getMoonPosition returns moon position data given time and location', function (t) {
    var moonPos = SunCalc.getMoonPosition(date, lat, lng)
    t.ok(near(moonPos.azimuth, -0.9783999522438226), 'azimuth')
    t.ok(near(moonPos.altitude, 0.014551482243892251), 'altitude')
    t.ok(near(moonPos.distance, 364121.37256256194), 'distance')
    t.end()
})

Tape.test('getMoonIllumination returns fraction and angle of moon\'s illuminated limb and phase', function (t) {
    var moonIllum = SunCalc.getMoonIllumination(date)
    t.ok(near(moonIllum.fraction, 0.4848068202456373), 'fraction')
    t.ok(near(moonIllum.phase, 0.7548368838538762), 'phase')
    t.ok(near(moonIllum.angle, 1.6732942678578346), 'angle')
    t.end()
})

Tape.test('getMoonTimes returns moon rise and set times', function (t) {
    var moonTimes = SunCalc.getMoonTimes(DateTime.utc(2013,3,4), lat, lng, true)
    t.equal(
        moonTimes.rise.toUTC().set({milliseconds: 0}).toISO(),
        DateTime.fromHTTP('Mon, 04 Mar 2013 23:54:29 GMT').toUTC().toISO(),
        "moonrise")
    t.equal(
        moonTimes.set.toUTC().set({milliseconds: 0}).toISO(),
        DateTime.fromHTTP('Mon, 04 Mar 2013 07:47:58 GMT').toUTC().toISO(),
        "moonset")
    t.end()
})
