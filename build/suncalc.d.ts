import { DateTime } from 'luxon';
declare class AziAlt {
    altitude: number;
    azimuth: number;
}
declare class SunCalc {
    getPosition(date: DateTime, lat: number, lng: number): AziAlt;
    times: (string | number)[][];
    addTime(angle: any, riseName: any, setName: any): void;
    tzLookup(lat: number, lng: number): string;
    getTimes(date: DateTime, lat: number, lng: number, height: number): {
        solarNoon: DateTime<boolean>;
        nadir: DateTime<boolean>;
    };
    getMoonPosition(date: DateTime, lat: number, lng: number): {
        azimuth: number;
        altitude: number;
        distance: number;
        parallacticAngle: number;
    };
    getMoonIllumination(date: DateTime): {
        fraction: number;
        phase: number;
        angle: number;
    };
    getMoonTimes(date: DateTime, lat: number, lng: number, inUTC: boolean): {};
}
declare const _default: SunCalc;
export default _default;
