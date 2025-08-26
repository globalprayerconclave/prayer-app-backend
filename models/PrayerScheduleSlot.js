const mongoose = require('mongoose');

const prayerScheduleSlotSchema = new mongoose.Schema({
  dayOfWeek: { type: String, required: true }, // e.g. "Monday"
  startTime24hIST: { type: String, required: true }, // e.g. "08:00"
  endTime24hIST: { type: String, required: true },   // e.g. "09:00"
  slotTargets: [
    {
      type: {
        type: String, // "country", "topic", "linguistic"
        required: true
      },
      countryName: { type: String },  // only if type === "country"
      topicName: { type: String },    // optional if type === "topic"
      language: { type: String }      // optional if type === "linguistic"
    }
  ]
}, { collection: 'prayerScheduleSlots' }); 
// 👆 ensures it uses your existing collection in Atlas

module.exports = mongoose.model('PrayerScheduleSlot', prayerScheduleSlotSchema);
