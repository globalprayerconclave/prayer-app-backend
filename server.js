// server.js
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI || "your_mongodb_atlas_connection_string", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Define Schema
const prayerScheduleSchema = new mongoose.Schema(
  {
    country: String,
    language: String,
    startTime: String,
    endTime: String,
    topic: String,
    intercessor: String,
  },
  { collection: "prayerScheduleSlots" } // 👈 Ensures it points to your collection
);

// Model
const PrayerSchedule = mongoose.model(
  "PrayerSchedule",
  prayerScheduleSchema
);

// API: Get all slots
app.get("/api/schedule", async (req, res) => {
  try {
    const slots = await PrayerSchedule.find();
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schedule", error });
  }
});

// API: Get current live slot
app.get("/api/current", async (req, res) => {
  try {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5); // HH:MM format

    // Find one slot that matches current time
    const liveSlot = await PrayerSchedule.findOne({
      startTime: { $lte: currentTime },
      endTime: { $gte: currentTime },
    });

    if (liveSlot) {
      res.json(liveSlot);
    } else {
      res.json({ message: "No live session right now" });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching current slot", error });
  }
});

// API: Add new slot
app.post("/api/schedule", async (req, res) => {
  try {
    const newSlot = new PrayerSchedule(req.body);
    await newSlot.save();
    res.json({ message: "New slot added", newSlot });
  } catch (error) {
    res.status(500).json({ message: "Error adding slot", error });
  }
});

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
