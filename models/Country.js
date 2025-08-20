const mongoose = require('mongoose');

const countrySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  region: { type: String, required: true },
  flag: { type: String, required: true },
  capital: { type: String, required: true },
  population: { type: String, required: true },
  headOfState: { type: String, required: true },
  prominentReligion: { type: String, required: true },
  christianPopulation: { type: String, required: true },
  prayerSchedule: { type: String, required: true },
  prayerPoints: { type: [String], required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true }
});

module.exports = mongoose.model('Country', countrySchema);