const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const Country = require('./models/Country'); // Ensure this path is correct

const app = express();

// Middleware
app.use(cors()); // Enables cross-origin requests from your frontend
app.use(express.json()); // Parses JSON bodies of incoming requests

// Database connection
mongoose.connect('mongodb+srv://prayer_app_user_new:cnUD4CnoQXQ5J9rx@cluster0.l7isr4v.mongodb.net/prayerConclave?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true, // Deprecated, but still good to have for older drivers
  useUnifiedTopology: true // Deprecated, but still good to have for older drivers
})
.then(() => console.log('Connected to MongoDB'))
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