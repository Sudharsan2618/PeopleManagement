const express = require("express");
const pino = require("pino");
const QRCode = require("qrcode");
const {
  startSession,
  stopSession,
  getSession,
  getAllSessions,
  toJid,
} = require("./session-manager");
const rateLimiter = require("./rate-limiter");

const log = pino({ level: process.env.LOG_LEVEL || "info" });
const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "";

app.use(express.json({ limit: "10mb" }));

// Auth middleware
app.use((req, res, next) => {
  if (BRIDGE_SECRET && req.headers["x-bridge-secret"] !== BRIDGE_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

// ── Health ───────────────────────────────────────────────────────────────────

app.get("/health", (_req, res) => {
  res.json({ status: "ok", sessions: getAllSessions() });
});

// ── Session Management ──────────────────────────────────────────────────────

app.post("/session/start", async (req, res) => {
  const { session_id } = req.body;
  if (!session_id) return res.status(400).json({ error: "session_id required" });

  try {
    const entry = await startSession(session_id);
    res.json({ session_id, status: entry.status });
  } catch (err) {
    log.error({ err: err.message }, "Failed to start session");
    res.status(500).json({ error: err.message });
  }
});

app.get("/session/:id/status", (req, res) => {
  const entry = getSession(req.params.id);
  if (!entry) return res.json({ session_id: req.params.id, status: "disconnected" });
  res.json({ session_id: req.params.id, status: entry.status });
});

app.get("/session/:id/qr", async (req, res) => {
  const entry = getSession(req.params.id);
  if (!entry || !entry.qr) {
    return res.json({ session_id: req.params.id, qr: null, status: entry?.status || "disconnected" });
  }
  try {
    const qrDataUrl = await QRCode.toDataURL(entry.qr, { width: 300 });
    res.json({ session_id: req.params.id, qr: qrDataUrl, status: entry.status });
  } catch (err) {
    res.status(500).json({ error: "Failed to generate QR" });
  }
});

app.post("/session/:id/logout", async (req, res) => {
  const entry = getSession(req.params.id);
  if (entry?.socket) {
    try {
      await entry.socket.logout();
    } catch {}
  }
  await stopSession(req.params.id);
  res.json({ session_id: req.params.id, status: "disconnected" });
});

// ── Send Messages ───────────────────────────────────────────────────────────

app.post("/send/text", async (req, res) => {
  const { session_id, to, text } = req.body;
  if (!session_id || !to || !text) {
    return res.status(400).json({ error: "session_id, to, text required" });
  }

  const entry = getSession(session_id);
  if (!entry || entry.status !== "connected") {
    return res.status(400).json({ error: "Session not connected" });
  }

  const limit = rateLimiter.check(session_id);
  if (!limit.allowed) {
    return res.status(429).json({ error: limit.reason });
  }

  try {
    const jid = toJid(to);
    const result = await entry.socket.sendMessage(jid, { text });
    rateLimiter.record(session_id);
    res.json({
      success: true,
      message_id: result.key.id,
      raw: result,
    });
  } catch (err) {
    log.error({ err: err.message, to }, "Send text failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/send/media", async (req, res) => {
  const { session_id, to, media_type, url, caption, filename } = req.body;
  if (!session_id || !to || !media_type || !url) {
    return res
      .status(400)
      .json({ error: "session_id, to, media_type, url required" });
  }

  const entry = getSession(session_id);
  if (!entry || entry.status !== "connected") {
    return res.status(400).json({ error: "Session not connected" });
  }

  const limit = rateLimiter.check(session_id);
  if (!limit.allowed) {
    return res.status(429).json({ error: limit.reason });
  }

  try {
    const jid = toJid(to);
    let content;
    switch (media_type) {
      case "image":
        content = { image: { url }, caption: caption || undefined };
        break;
      case "video":
        content = { video: { url }, caption: caption || undefined };
        break;
      case "audio":
        content = { audio: { url }, mimetype: "audio/mpeg" };
        break;
      case "document":
        content = {
          document: { url },
          mimetype: "application/pdf",
          fileName: filename || "document",
          caption: caption || undefined,
        };
        break;
      default:
        return res.status(400).json({ error: `Unsupported media_type: ${media_type}` });
    }

    const result = await entry.socket.sendMessage(jid, content);
    rateLimiter.record(session_id);
    res.json({ success: true, message_id: result.key.id, raw: result });
  } catch (err) {
    log.error({ err: err.message, to, media_type }, "Send media failed");
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── Start Server ────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  log.info({ port: PORT }, "Baileys bridge started");
});
