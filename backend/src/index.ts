import express from "express";
import cors from "cors";
import helmet from "helmet";
import { env } from "./config/env";
import routes from "./routes";
import { errorHandler } from "./middlewares/error";

const app = express();

// Update CORS configuration to include extension origins
const allowedOrigins = [
  "chrome-extension://*", // Allow all Chrome extensions
  "http://localhost:*", // Development server
  // Add your production extension ID here later
];

app.use(
  cors({
    origin: "*", // Allow all origins for testing
    methods: ["POST", "GET", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-Request-ID", "Origin"],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(
  express.raw({
    type: ["image/*", "audio/*"],
    limit: "10mb",
  })
);

// Routes
app.use("/api/v1", routes);

// Error handling
app.use(errorHandler);

const PORT = 9998; // Use a specific port number to avoid conflicts
app.listen(PORT, () => {
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`);
});
