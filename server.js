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
let db; 
mongoose.connect('mongodb+srv://prayer_app_user_new:cnUD4CnoQXQ5J9rx@cluster0.l7isr4v.mongodb.net/prayerConclave?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(client => { 
    db = client.connections[0].db; 
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


// Catch-all for unhandled routes (will return 404)
app.use((req, res, next) => {
  res.status(404).send("Cannot GET " + req.originalUrl);
});

// Error handling middleware (optional, but good practice)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});


// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});