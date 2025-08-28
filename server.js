const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Country = require('./models/Country');
const PrayerScheduleSlot = require('./models/PrayerScheduleSlot');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(
  'mongodb+srv://prayer_app_user_new:cnUD4CnoQXQ5J9rx@cluster0.l7isr4v.mongodb.net/prayerConclave?retryWrites=true&w=majority&appName=Cluster0',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(() => console.log('✅ Connected to MongoDB Atlas'))
.catch((err) => console.error('❌ MongoDB connection error:', err));


// =========================
// API ROUTES
// =========================

// 1. Get all countries (for sidebar)
app.get('/api/countries', async (req, res) => {
  try {
    const countries = await Country.find({}, 'name region').sort({ name: 1 }).lean();
    res.json(countries);
  } catch (error) {
    console.error('Error fetching all countries:', error);
    res.status(500).json({ message: 'Error fetching all countries: ' + error.message });
  }
});

// 2. Get a single country by name (for details)
app.get('/api/countries/:name', async (req, res) => {
  try {
    const countryName = decodeURIComponent(req.params.name);
    const country = await Country.findOne({ name: countryName }).lean();
    if (!country) {
      return res.status(404).json({ message: 'Country not found' });
    }
    res.json(country);
  } catch (error) {
    console.error('Error fetching single country:', error);
    res.status(500).json({ message: 'Error fetching country details: ' + error.message });
  }
});

// 3. Get the current live prayer slot
app.get('/api/current-prayer-slot', async (req, res) => {
  try {
    // 1. Get current time in IST (RELIABLE METHOD)
const now = new Date();
const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
const istTime = new Date(now.getTime() + istOffset);

// 2. Calculate IST day and time
const istDayOfWeek = ["Sunday", "Monday", "Tuesday", "Wednesday",
                     "Thursday", "Friday", "Saturday"][istTime.getUTCDay()];

const istHours = String(istTime.getUTCHours()).padStart(2, '0');
const istMinute = String(istTime.getUTCMinutes()).padStart(2, '0');
const currentTime24hIST = `${istHours}:${istMinute}`;

console.log(`🔎 [CORRECTED] Prayer Slot → Day=${istDayOfWeek}, Time=${currentTime24hIST} IST`);

// 3. Find matching prayer slot
const currentSlot = await PrayerScheduleSlot.findOne({
  dayOfWeek: istDayOfWeek, // <--- Using the new, reliable IST day
  startTime24hIST: { $lte: currentTime24hIST },
  endTime24hIST: { $gt: currentTime24hIST }
}).lean();
    if (currentSlot) {
      // Populate country details for country-type targets
      const populatedTargets = await Promise.all(
        (currentSlot.slotTargets || []).map(async (target) => {
          if (target.type === 'country') {
            const countryDetails = await Country.findOne({ name: target.countryName }).lean();
            return { ...target, countryDetails };
          }
          return target;
        })
      );

      res.json({ ...currentSlot, slotTargets: populatedTargets });
    } else {
      res.json({ type: "general", message: "🙏 General Prayer Time / No Specific Slot" });
    }

  } catch (error) {
    console.error('Error fetching current prayer slot:', error);
    res.status(500).json({ message: 'Error fetching current prayer slot: ' + error.message });
  }
});


// =========================
// FALLBACKS & ERROR HANDLING
// =========================
app.use((req, res, next) => {
  res.status(404).send("❌ Cannot GET " + req.originalUrl);
});

app.use((err, req, res, next) => {
  console.error("Unexpected Error:", err.stack);
  res.status(500).send('Something broke!');
});

// =========================
// START SERVER
// =========================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
