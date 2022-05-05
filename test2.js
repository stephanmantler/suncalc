import SunCalc from './suncalc.js'

console.log('London:', SunCalc.getTimes(new Date(), 51, 0))
console.log('NYC:', SunCalc.getTimes(new Date(), 40.7, -74))
