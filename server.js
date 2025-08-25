const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Country = require('./models/Country'); // Ensure this path is correct

const app = express();

// Middleware
app.use(cors()); // Enables cross-origin requests from your frontend
app.use(express.json()); // Parses JSON bodies of incoming requests

// Database connection
// Store the Mongoose connection object globally
let db; // <--- THIS IS THE MISSING DECLARATION
mongoose.connect('mongodb+srv://prayer_app_user_new:cnUD4CnoQXQ5J9rx@cluster0.l7isr4v.mongodb.net/prayerConclave?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(client => { // Use the client parameter from the successful connection
    db = client.connections[0].db; // Get the native MongoDB driver's DB object
    console.log('Connected to MongoDB');
})
.catch(err => console.error('MongoDB connection error:', err));


// API Routes
// Route to get all countries (for sidebar)
app.get('/api/countries', async (req, res) => {
  try {
    // Only fetch name and region for the sidebar, and sort by name
    const countries = await Country.find({}, 'name region').sort({name: 1});
    res.json(countries);
  } catch (error) {
    console.error('Error fetching all countries:', error); // Log error on backend
    res.status(500).json({ message: 'Error fetching all countries: ' + error.message });
  }
});

// Route to get a single country by name (for details)
app.get('/api/countries/:name', async (req, res) => {
  try {
    const countryName = decodeURIComponent(req.params.name); // Decode URL-encoded name
    const country = await Country.findOne({ name: countryName });
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json(country);
  } catch (error) {
    console.error('Error fetching single country:', error); // Log error on backend
    res.status(500).json({ message: 'Error fetching country details: ' + error.message });
  }
});

// NEW API Route: Get the current prayer slot
app.get('/api/current-prayer-slot', async (req, res) => {
  try {
    // Ensure 'db' is initialized before attempting to use it
    if (!db) {
        throw new Error("Database connection not initialized.");
    }

    const now = new Date();
    // Use .getUTCDay() for consistency with array indexing if needed, but for dayOfWeek string, now.getDay() is fine.
    const dayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][now.getDay()];
    
    // Get current time in IST for comparison
    const istTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Kolkata"}));
    const istHour = String(istTime.getHours()).padStart(2, '0');
    const istMinute = String(istTime.getMinutes()).padStart(2, '0');
    const currentTime24hIST = `${istHour}:${istMinute}`; // HH:MM format in IST

    console.log(`Live Prayer Request: Day=${dayOfWeek}, Time=${currentTime24hIST} IST`);

    // Find the slot for the current day and time
    const currentSlot = await db.collection('prayerScheduleSlots').findOne({
      dayOfWeek: dayOfWeek,
      startTime24hIST: { $lte: currentTime24hIST }, // Start time is less than or equal to current
      endTime24hIST: { $gt: currentTime24hIST }    // End time is greater than current (exclusive of end)
    });

    if (currentSlot) {
      // For each target in the slot, if it's a country, fetch its full details
      const populatedTargets = await Promise.all(currentSlot.slotTargets.map(async (target) => {
        if (target.type === 'country') {
          // Use db.collection('countries') to fetch from the correct collection
          const countryDetails = await db.collection('countries').findOne({ name: target.countryName }); 
          if (!countryDetails) {
              console.warn(`Country details not found for: ${target.countryName}`);
          }
          // Convert Mongoose document to plain JavaScript object before spreading
          return { ...target, countryDetails: countryDetails ? countryDetails.toObject() : null };
        }
        return target; // Return linguistic/topic targets as is
      }));
      // Convert Mongoose document to plain JavaScript object before sending
      res.json({ ...currentSlot.toObject(), slotTargets: populatedTargets });
    } else {
      // If no specific slot found for this time
      res.json({ type: "general", message: "General Prayer Time / No Specific Slot" });
    }

  } catch (error) {
    console.error('Error fetching current prayer slot:', error);
    res.status(500).json({ message: 'Error fetching current prayer slot: ' + error.message });
  }
});

// TEMPORARY: One-time import route for prayer_schedule_slots.json
app.get('/api/import-schedule-data', async (req, res) => {
  try {
    const scheduleToImport = [{"dayOfWeek":"Monday","startTime24hIST":"00:30","endTime24hIST":"01:00","slotTargets":[{"type":"country","countryName":"Australia","details":"English"},{"type":"country","countryName":"Fiji","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"01:00","endTime24hIST":"02:00","slotTargets":[{"type":"country","countryName":"Algeria","details":"English"},{"type":"country","countryName":"Angola","details":"English"},{"type":"country","countryName":"Botswana","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"02:00","endTime24hIST":"03:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"22 Arab League Nations"}]},{"dayOfWeek":"Monday","startTime24hIST":"03:00","endTime24hIST":"04:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Arab Nations"}]},{"dayOfWeek":"Monday","startTime24hIST":"04:00","endTime24hIST":"04:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Monday","startTime24hIST":"04:30","endTime24hIST":"05:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Indonesian"}]},{"dayOfWeek":"Monday","startTime24hIST":"05:00","endTime24hIST":"05:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Malayalam"}]},{"dayOfWeek":"Monday","startTime24hIST":"05:30","endTime24hIST":"06:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Hindi"}]},{"dayOfWeek":"Monday","startTime24hIST":"06:00","endTime24hIST":"06:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"06:30","endTime24hIST":"07:00","slotTargets":[{"type":"country","countryName":"Bangladesh","details":"English"},{"type":"country","countryName":"Bhutan","details":"English"},{"type":"country","countryName":"Kazakhstan","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"07:00","endTime24hIST":"08:30","slotTargets":[{"type":"country","countryName":"Armenia","details":"English"},{"type":"country","countryName":"Azerbaijan","details":"English"},{"type":"country","countryName":"Bahrain","details":"English"},{"type":"country","countryName":"Georgia","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"08:30","endTime24hIST":"09:30","slotTargets":[{"type":"country","countryName":"Burundi","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"09:30","endTime24hIST":"10:30","slotTargets":[{"type":"country","countryName":"Albania","details":"English"},{"type":"country","countryName":"Andorra","details":"English"},{"type":"country","countryName":"Bosnia and Herzegovina","details":"English"},{"type":"country","countryName":"Croatia","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"10:30","endTime24hIST":"11:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Monday","startTime24hIST":"11:00","endTime24hIST":"11:30","slotTargets":[{"type":"country","countryName":"Brunei","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"11:30","endTime24hIST":"13:00","slotTargets":[{"type":"country","countryName":"Benin","details":"English"},{"type":"country","countryName":"Burkina Faso","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"13:00","endTime24hIST":"14:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Marketplace Prayer"}]},{"dayOfWeek":"Monday","startTime24hIST":"14:30","endTime24hIST":"16:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"12 Noon Prayer For Israel / Church"}]},{"dayOfWeek":"Monday","startTime24hIST":"16:30","endTime24hIST":"17:30","slotTargets":[{"type":"country","countryName":"Antigua and Barbuda","details":"English"},{"type":"country","countryName":"Bahamas","details":"English"},{"type":"country","Name":"Barbados","details":"English"},{"type":"country","countryName":"Belize","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"17:30","endTime24hIST":"18:00","slotTargets":[{"type":"country","countryName":"Argentina","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"18:00","endTime24hIST":"18:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Alliances"}]},{"dayOfWeek":"Monday","startTime24hIST":"18:30","endTime24hIST":"19:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Environment"}]},{"dayOfWeek":"Monday","startTime24hIST":"19:00","endTime24hIST":"19:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Educators"}]},{"dayOfWeek":"Monday","startTime24hIST":"19:30","endTime24hIST":"20:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Evening Prayer","details":"Prayer In Regional Language"}]},{"dayOfWeek":"Monday","startTime24hIST":"20:30","endTime24hIST":"21:30","slotTargets":[{"type":"country","countryName":"Austria","details":"English"},{"type":"country","countryName":"Belarus","details":"English"},{"type":"country","countryName":"Belgium","details":"English"},{"type":"country","countryName":"Bulgaria","details":"English"},{"type":"country","countryName":"Denmark","details":"English"},{"type":"country","countryName":"Estonia","details":"English"}]},{"dayOfWeek":"Monday","startTime24hIST":"21:30","endTime24hIST":"00:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prophetical Worship / Intercession"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"00:30","endTime24hIST":"01:00","slotTargets":[{"type":"country","countryName":"Kiribati","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"01:00","endTime24hIST":"02:00","slotTargets":[{"type":"country","countryName":"Central African Republic","details":"English"},{"type":"country","countryName":"Chad","details":"English"},{"type":"country","countryName":"Egypt","details":"English"},{"type":"country","countryName":"Eswatini","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"02:00","endTime24hIST":"03:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"22 Arab League Nations"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"03:00","endTime24hIST":"04:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Arab Nations"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"04:00","endTime24hIST":"04:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"04:30","endTime24hIST":"05:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Indonesian"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"05:00","endTime24hIST":"05:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Malayalam"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"05:30","endTime24hIST":"06:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Hindi"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"06:00","endTime24hIST":"06:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar", "details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"06:30","endTime24hIST":"07:00","slotTargets":[{"type":"country","countryName":"China","details":"English"},{"type":"country","countryName":"Kyrgyzstan","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"07:00","endTime24hIST":"08:30","slotTargets":[{"type":"country","countryName":"Iran","details":"English"},{"type":"country","countryName":"Iraq","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"08:30","endTime24hIST":"09:30","slotTargets":[{"type":"country","countryName":"Eritrea","details":"English"},{"type":"country","countryName":"Ethiopia","details":"English"},{"type":"country","countryName":"Kenya","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"09:30","endTime24hIST":"10:30","slotTargets":[{"type":"country","countryName":"Cyprus","details":"English"},{"type":"country","countryName":"Greece","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"10:30","endTime24hIST":"11:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"11:00","endTime24hIST":"11:30","slotTargets":[{"type":"country","countryName":"Cambodia","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"11:30","endTime24hIST":"13:00","slotTargets":[{"type":"country","countryName":"Gambia","details":"English"},{"type":"country","countryName":"Ghana","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"13:00","endTime24hIST":"14:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Marketplace Prayer"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"14:30","endTime24hIST":"16:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"12 Noon Prayer For Israel / Church"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"16:30","endTime24hIST":"17:30","slotTargets":[{"type":"country","countryName":"Canada","details":"English"},{"type":"country","countryName":"Costa Rica","details":"English"},{"type":"country","countryName":"Cuba","details":"English"},{"type":"country","countryName":"Dominica","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"17:30","endTime24hIST":"18:00","slotTargets":[{"type":"country","countryName":"Bolivia","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"18:00","endTime24hIST":"18:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Alliances"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"18:30","endTime24hIST":"19:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Environment"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"19:00","endTime24hIST":"19:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Educators"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"19:30","endTime24hIST":"20:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Evening Prayer","details":"Pray For Drug Addiction"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"20:30","endTime24hIST":"21:30","slotTargets":[{"type":"country","countryName":"Czechia","details":"English"},{"type":"country","countryName":"Finland","details":"English"},{"type":"country","countryName":"France","details":"English"},{"type":"country","countryName":"Hungary","details":"English"},{"type":"country","countryName":"Iceland","details":"English"}]},{"dayOfWeek":"Tuesday","startTime24hIST":"21:30","endTime24hIST":"00:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prophetical Worship / Intercession"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"00:30","endTime24hIST":"01:00","slotTargets":[{"type":"country","countryName":"Marshall Islands","details":"English"},{"type":"country","countryName":"Micronesia","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"01:00","endTime24hIST":"02:00","slotTargets":[{"type":"country","countryName":"Democratic Republic of the Congo","details":"English"},{"type":"country","countryName":"Lesotho","details":"English"},{"type":"country","countryName":"Libya","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"02:00","endTime24hIST":"03:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"22 Arab League Nations"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"03:00","endTime24hIST":"04:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Middle East"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"04:00","endTime24hIST":"04:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"04:30","endTime24hIST":"05:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Indonesian"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"05:00","endTime24hIST":"05:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Malayalam"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"05:30","endTime24hIST":"06:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Hindi"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"06:00","endTime24hIST":"06:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"06:30","endTime24hIST":"07:00","slotTargets":[{"type":"country","countryName":"India","details":"English"},{"type":"country","countryName":"Tajikistan","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"07:00","endTime24hIST":"08:30","slotTargets":[{"type":"country","countryName":"Afghanistan","details":"English"},{"type":"country","countryName":"Israel","details":"English"},{"type":"country","countryName":"Jordan","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"08:30","endTime24hIST":"09:30","slotTargets":[{"type":"country","countryName":"Madagascar","details":"English"},{"type":"country","countryName":"Malawi","details":"English"},{"type":"country","countryName":"Mauritius","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"09:30","endTime24hIST":"10:30","slotTargets":[{"type":"country","countryName":"Italy","details":"English"},{"type":"country","countryName":"Malta","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"10:30","endTime24hIST":"11:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"11:00","endTime24hIST":"11:30","slotTargets":[{"type":"country","countryName":"Indonesia","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"11:30","endTime24hIST":"13:00","slotTargets":[{"type":"country","countryName":"Guinea","details":"English"},{"type":"country","countryName":"Guinea-Bissau","details":"English"},{"type":"country","countryName":"Ivory Coast","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"13:00","endTime24hIST":"14:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Marketplace Prayer"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"14:30","endTime24hIST":"16:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"12 Noon Prayer For Israel / Church"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"16:30","endTime24hIST":"17:30","slotTargets":[{"type":"country","countryName":"Dominican Republic","details":"English"},{"type":"country","countryName":"Grenada","details":"English"},{"type":"country","countryName":"Guatemala","details":"English"},{"type":"country","countryName":"Haiti","details":"English"},{"type":"country","countryName":"Honduras","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"17:30","endTime24hIST":"18:00","slotTargets":[{"type":"country","countryName":"Brazil","details":"English"},{"type":"country","country":"Chile","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"18:00","endTime24hIST":"18:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Alliances"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"18:30","endTime24hIST":"19:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Environment"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"19:00","endTime24hIST":"19:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Educators"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"19:30","endTime24hIST":"20:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Evening Prayer","details":"Current Concerns / Elections"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"20:30","endTime24hIST":"21:30","slotTargets":[{"type":"country","countryName":"Germany","details":"English"},{"type":"country","countryName":"Ireland","details":"English"},{"type":"country","countryName":"Liechtenstein","details":"English"},{"type":"country","countryName":"Moldova","details":"English"}]},{"dayOfWeek":"Wednesday","startTime24hIST":"21:30","endTime24hIST":"00:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prophetical Worship / Intercession"}]},{"dayOfWeek":"Thursday","startTime24hIST":"00:30","endTime24hIST":"01:00","slotTargets":[{"type":"country","countryName":"Nauru","details":"English"},{"type":"country","countryName":"New Zealand","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"01:00","endTime24hIST":"02:00","slotTargets":[{"type":"country","countryName":"Equatorial Guinea","details":"English"},{"type":"country","countryName":"Morocco","details":"English"},{"type":"country","countryName":"Namibia","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"02:00","endTime24hIST":"03:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"22 Arab League Nations"}]},{"dayOfWeek":"Thursday","startTime24hIST":"03:00","endTime24hIST":"04:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Arab Nations"}]},{"dayOfWeek":"Thursday","startTime24hIST":"04:00","endTime24hIST":"04:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Thursday","startTime24hIST":"04:30","endTime24hIST":"05:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Indonesian"}]},{"dayOfWeek":"Thursday","startTime24hIST":"05:00","endTime24hIST":"05:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Malayalam"}]},{"dayOfWeek":"Thursday","startTime24hIST":"05:30","endTime24hIST":"06:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Hindi"}]},{"dayOfWeek":"Thursday","startTime24hIST":"06:00","endTime24hIST":"06:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"06:30","endTime24hIST":"07:00","slotTargets":[{"type":"country","countryName":"Japan","details":"English"},{"type":"country","countryName":"Maldives","details":"English"},{"type":"country","countryName":"Turkmenistan","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"07:00","endTime24hIST":"08:30","slotTargets":[{"type":"country","countryName":"Kuwait","details":"English"},{"type":"country","countryName":"Lebanon","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"08:30","endTime24hIST":"09:30","slotTargets":[{"type":"country","countryName":"Mozambique","details":"English"},{"type":"country","countryName":"Rwanda","details":"English"},{"type":"country","countryName":"Seychelles","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"09:30","endTime24hIST":"10:30","slotTargets":[{"type":"country","countryName":"Montenegro","details":"English"},{"type":"country","countryName":"North Macedonia","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"10:30","endTime24hIST":"11:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Thursday","startTime24hIST":"11:00","endTime24hIST":"11:30","slotTargets":[{"type":"country","countryName":"Laos","details":"English"},{"type":"country","countryName":"Malaysia","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"11:30","endTime24hIST":"13:00","slotTargets":[{"type":"country","countryName":"Liberia","details":"English"},{"type":"country","countryName":"Mali","details":"English"},{"type":"country","countryName":"Mauritania","details":"English"}]},{"dayOfWeek":"Thursday","startTime24hIST":"13:00","endTime24hIST":"14:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Marketplace Prayer"}]},{"dayOfWeek":"Thursday","startTime24hIST":"14:30","endTime24hIST":"16:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"12 Noon Prayer For Israel / Church"}]},{"dayOfWeek":"Thursday","startTime24hIST":"16:30","endTime24hIST":"17:30","slotTargets":[{"type":"country","countryName":"Jamaica","details":"English"},{"type":"country","countryName":"Mexico","details":"English"},{"type":"country","countryName":"Trinidad and Tobago",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "startTime24hIST": "17:30",
        "endTime24hIST": "18:00",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Colombia",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Ecuador",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "startTime24hIST": "18:00",
        "endTime24hIST": "18:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Alliances"
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "startTime24hIST": "18:30",
        "endTime24hIST": "19:00",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Prayer For Environment"
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "startTime24hIST": "19:00",
        "endTime24hIST": "19:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Prayer For Educators"
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "startTime24hIST": "19:30",
        "endTime24hIST": "20:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Evening Prayer",
            "details": "Bible Study on Intercession"
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "startTime24hIST": "20:30",
        "endTime24hIST": "21:30",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Latvia",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Lithuania",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Luxembourg",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Poland",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Thursday",
        "startTime24hIST": "21:30",
        "endTime24hIST": "00:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Prophetical Worship / Intercession"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "00:30",
        "endTime24hIST": "01:00",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Palau",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Papua New Guinea",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "01:00",
        "endTime24hIST": "02:00",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Cameroon",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Gabon",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "South Africa",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Sudan",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "02:00",
        "endTime24hIST": "03:00",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "22 Arab League Nations"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "03:00",
        "endTime24hIST": "04:00",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Arab Nations"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "04:00",
        "endTime24hIST": "04:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Selah - Pause and Reflect"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "04:30",
        "endTime24hIST": "05:00",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Morning Altar",
            "details": "Indonesian"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "05:00",
        "endTime24hIST": "05:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Morning Altar",
            "details": "Malayalam"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "05:30",
        "endTime24hIST": "06:00",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Morning Altar",
            "details": "Hindi"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "06:00",
        "endTime24hIST": "06:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Morning Altar",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "06:30",
        "endTime24hIST": "07:00",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Mongolia",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Nepal",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "North Korea",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Uzbekistan",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "07:00",
        "endTime24hIST": "08:30",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Oman",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Qatar",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "08:30",
        "endTime24hIST": "09:30",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Comoros",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Somalia",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "South Sudan",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "09:30",
        "endTime24hIST": "10:30",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Portugal",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "San Marino",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "10:30",
        "endTime24hIST": "11:00",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Selah - Pause and Reflect"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "11:00",
        "endTime24hIST": "11:30",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Myanmar (Burma)",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Philippines",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "11:30",
        "endTime24hIST": "13:00",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Niger",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Nigeria",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "13:00",
        "endTime24hIST": "14:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Marketplace Prayer"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "14:30",
        "endTime24hIST": "16:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "12 Noon Prayer For Israel / Church"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "16:30",
        "endTime24hIST": "17:30",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Nicaragua",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Panama",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "17:30",
        "endTime24hIST": "18:00",
        "slotTargets": [
          {
            "type": "country",
            "countryName": "Guyana",
            "details": "English"
          },
          {
            "type": "country",
            "countryName": "Paraguay",
            "details": "English"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "18:00",
        "endTime24hIST": "18:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Alliances"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "18:30",
        "endTime24hIST": "19:00",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Prayer For Environment"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "19:00",
        "endTime24hIST": "19:30",
        "slotTargets": [
          {
            "type": "linguistic_topic",
            "topicTitle": "Focus Of The Hour",
            "details": "Prayer For Educators"
          }
        ]
      },
      {
        "dayOfWeek": "Friday",
        "startTime24hIST": "19:30",
        "endTime24hIST":"20:30",
        "slotTargets":[
          {"type":"linguistic_topic","topicTitle":"Evening Prayer","details":"Pray For Unreached People Groups"}
        ]
      },
      {"dayOfWeek":"Friday","startTime24hIST":"20:30","endTime24hIST":"21:30","slotTargets":[{"type":"country","countryName":"Monaco","details":"English"},{"type":"country","countryName":"Norway","details":"English"},{"type":"country","countryName":"Romania","details":"English"}]},{"dayOfWeek":"Friday","startTime24hIST":"21:30","endTime24hIST":"00:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prophetical Worship / Intercession"}]},{"dayOfWeek":"Saturday","startTime24hIST":"00:30","endTime24hIST":"01:00","slotTargets":[{"type":"country","countryName":"Samoa","details":"English"},{"type":"country","countryName":"Solomon Islands","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"01:00","endTime24hIST":"02:00","slotTargets":[{"type":"country","countryName":"Republic of the Congo","details":"English"},{"type":"country","countryName":"Tunisia","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"02:00","endTime24hIST":"03:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"22 Arab League Nations"}]},{"dayOfWeek":"Saturday","startTime24hIST":"03:00","endTime24hIST":"04:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Arab Nations"}]},{"dayOfWeek":"Saturday","startTime24hIST":"04:00","endTime24hIST":"04:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Saturday","startTime24hIST":"04:30","endTime24hIST":"05:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Indonesian"}]},{"dayOfWeek":"Saturday","startTime24hIST":"05:00","endTime24hIST":"05:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Malayalam"}]},{"dayOfWeek":"Saturday","startTime24hIST":"05:30","endTime24hIST":"06:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Hindi"}]},{"dayOfWeek":"Saturday","startTime24hIST":"06:00","endTime24hIST":"06:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"06:30","endTime24hIST":"07:00","slotTargets":[{"type":"country","countryName":"Pakistan","details":"English"},{"type":"country","countryName":"South Korea","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"07:00","endTime24hIST":"08:30","slotTargets":[{"type":"country","countryName":"Saudi Arabia","details":"English"},{"type":"country","countryName":"Syria","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"08:30","endTime24hIST":"09:30","slotTargets":[{"type":"country","countryName":"Djibouti","details":"English"},{"type":"country","countryName":"Tanzania","details":"English"},{"type":"country","countryName":"Uganda","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"09:30","endTime24hIST":"10:30","slotTargets":[{"type":"country","countryName":"Serbia","details":"English"},{"type":"country","countryName":"Slovenia","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"10:30","endTime24hIST":"11:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Saturday","startTime24hIST":"11:00","endTime24hIST":"11:30","slotTargets":[{"type":"country","countryName":"Singapore","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"11:30","endTime24hIST":"13:00","slotTargets":[{"type":"country","countryName":"Cabo Verde","details":"English"},{"type":"country","countryName":"Senegal","details":"English"},{"type":"country","countryName":"Sierra Leone","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"13:00","endTime24hIST":"14:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Marketplace Prayer"}]},{"dayOfWeek":"Saturday","startTime24hIST":"14:30","endTime24hIST":"16:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"12 Noon Prayer For Israel / Church"}]},{"dayOfWeek":"Saturday","startTime24hIST":"16:30","endTime24hIST":"17:30","slotTargets":[{"type":"country","countryName":"Saint Kitts and Nevis","details":"English"},{"type":"country","countryName":"Saint Lucia","details":"English"},{"type":"country","countryName":"Saint Vincent and the Grenadines","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"17:30","endTime24hIST":"18:00","slotTargets":[{"type":"country","countryName":"Peru","details":"English"},{"type":"country","countryName":"Suriname","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"18:00","endTime24hIST":"18:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Alliances"}]},{"dayOfWeek":"Saturday","startTime24hIST":"18:30","endTime24hIST":"19:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Environment"}]},{"dayOfWeek":"Saturday","startTime24hIST":"19:00","endTime24hIST":"19:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Educators"}]},{"dayOfWeek":"Saturday","startTime24hIST":"19:30","endTime24hIST":"20:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Evening Prayer","details":"Special Meetings"}]},{"dayOfWeek":"Saturday","startTime24hIST":"20:30","endTime24hIST":"21:30","slotTargets":[{"type":"country","countryName":"Netherlands","details":"English"},{"type":"country","countryName":"Russia","details":"English"},{"type":"country","countryName":"Slovakia","details":"English"},{"type":"country","countryName":"Sweden","details":"English"}]},{"dayOfWeek":"Saturday","startTime24hIST":"21:30","endTime24hIST":"00:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prophetical Worship / Intercession"}]},{"dayOfWeek":"Sunday","startTime24hIST":"00:30","endTime24hIST":"01:00","slotTargets":[{"type":"country","countryName":"Tonga","details":"English"},{"type":"country","countryName":"Tuvalu","details":"English"},{"type":"country","countryName":"Vanuatu","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"01:00","endTime24hIST":"02:00","slotTargets":[{"type":"country","countryName":"Sao Tome and Principe","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"02:00","endTime24hIST":"03:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"22 Arab League Nations"}]},{"dayOfWeek":"Sunday","startTime24hIST":"03:00","endTime24hIST":"04:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Arab Nations"}]},{"dayOfWeek":"Sunday","startTime24hIST":"04:00","endTime24hIST":"04:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Sunday","startTime24hIST":"04:30","endTime24hIST":"05:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Indonesian"}]},{"dayOfWeek":"Sunday","startTime24hIST":"05:00","endTime24hIST":"05:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Malayalam"}]},{"dayOfWeek":"Sunday","startTime24hIST":"05:30","endTime24hIST":"06:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"Hindi"}]},{"dayOfWeek":"Sunday","startTime24hIST":"06:00","endTime24hIST":"06:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Morning Altar","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"06:30","endTime24hIST":"07:00","slotTargets":[{"type":"country","countryName":"Sri Lanka","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"07:00","endTime24hIST":"08:30","slotTargets":[{"type":"country","countryName":"Turkey","details":"English"},{"type":"country","countryName":"United Arab Emirates","details":"English"},{"type":"country","countryName":"Yemen","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"08:30","endTime24hIST":"09:30","slotTargets":[{"type":"country","countryName":"Zambia","details":"English"},{"type":"country","countryName":"Zimbabwe","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"09:30","endTime24hIST":"10:30","slotTargets":[{"type":"country","countryName":"Spain","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"10:30","endTime24hIST":"11:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Selah - Pause and Reflect"}]},{"dayOfWeek":"Sunday","startTime24hIST":"11:00","endTime24hIST":"11:30","slotTargets":[{"type":"country","countryName":"Thailand","details":"English"},{"type":"country","countryName":"Timor-Leste","details":"English"},{"type":"country","countryName":"Vietnam","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"11:30","endTime24hIST":"13:00","slotTargets":[{"type":"country","countryName":"Togo","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"13:00","endTime24hIST":"14:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Marketplace Prayer"}]},{"dayOfWeek":"Sunday","startTime24hIST":"14:30","endTime24hIST":"16:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"12 Noon Prayer For Israel / Church"}]},{"dayOfWeek":"Sunday","startTime24hIST":"16:30","endTime24hIST":"17:30","slotTargets":[{"type":"country","countryName":"El Salvador","details":"English"},{"type":"country","countryName":"United States of America","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"17:30","endTime24hIST":"18:00","slotTargets":[{"type":"country","countryName":"Uruguay","details":"English"},{"type":"country","countryName":"Venezuela","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"18:00","endTime24hIST":"18:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Alliances"}]},{"dayOfWeek":"Sunday","startTime24hIST":"18:30","endTime24hIST":"19:00","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Environment"}]},{"dayOfWeek":"Sunday","startTime24hIST":"19:00","endTime24hIST":"19:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prayer For Educators"}]},{"dayOfWeek":"Sunday","startTime24hIST":"19:30","endTime24hIST":"20:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Evening Prayer","details":"Sunday Service"}]},{"dayOfWeek":"Sunday","startTime24hIST":"20:30","endTime24hIST":"21:30","slotTargets":[{"type":"country","countryName":"Switzerland","details":"English"},{"type":"country","countryName":"Ukraine","details":"English"},{"type":"country","countryName":"United Kingdom","details":"English"}]},{"dayOfWeek":"Sunday","startTime24hIST":"21:30","endTime24hIST":"00:30","slotTargets":[{"type":"linguistic_topic","topicTitle":"Focus Of The Hour","details":"Prophetical Worship / Intercession"}]}]