import express from "express";
import dotenv from "dotenv";
import cors from "cors";

import publicRoutes from "./routes/public.routes.js";
import dashboardRoutes from "./routes/student_dashboard.routes.js";
import mentorDashboardRoutes from "./routes/mentor_dashboard.routes.js";
import cronJobs from "./routes/cron.routes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Trust Render proxy
app.set("trust proxy", 1);

// Allowed origins
const envOrigins = (process.env.ORIGIN || "")
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const allowedOrigins = [
  "http://localhost:5173",
  "https://kalvium-porfolio.vercel.app", 
  ...envOrigins,
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.use("/public", publicRoutes);
app.use("/student/dashboard", dashboardRoutes);
app.use("/mentor/dashboard", mentorDashboardRoutes);
app.use("/cron/", cronJobs);

app.get("/", (req, res) => {
  res.send("Backend is working");
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});