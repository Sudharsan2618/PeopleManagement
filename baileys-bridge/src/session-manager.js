const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} = require("@whiskeysockets/baileys");
const path = require("path");
const fs = require("fs");
const pino = require("pino");
const axios = require("axios");

const log = pino({ level: process.env.LOG_LEVEL || "info" });

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "";
const SESSION_DIR = process.env.SESSION_DIR || "./sessions";

const sessions = new Map();

function getSessionDir(sessionId) {
  const dir = path.join(SESSION_DIR, sessionId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

async function startSession(sessionId) {
  if (sessions.has(sessionId)) {
    const existing = sessions.get(sessionId);
    if (existing.status === "connected") return existing;
    await stopSession(sessionId);
  }

  const sessionDir = getSessionDir(sessionId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const entry = {
    sessionId,
    status: "connecting",
    qr: null,
    socket: null,
    retryCount: 0,
  };
  sessions.set(sessionId, entry);

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, log),
    },
    printQRInTerminal: false,
    logger: log.child({ session: sessionId }),
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  entry.socket = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      entry.qr = qr;
      entry.status = "qr_pending";
      log.info({ sessionId }, "QR code generated");
    }

    if (connection === "open") {
      entry.status = "connected";
      entry.qr = null;
      entry.retryCount = 0;
      log.info({ sessionId }, "Connected");
      notifyFastAPI("status", { session_id: sessionId, status: "connected" });
    }

    if (connection === "close") {
      const statusCode =
        lastDisconnect?.error?.output?.statusCode ||
        lastDisconnect?.error?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      if (loggedOut) {
        entry.status = "disconnected";
        entry.qr = null;
        log.info({ sessionId }, "Logged out — clearing session");
        clearSessionFiles(sessionId);
        notifyFastAPI("status", {
          session_id: sessionId,
          status: "disconnected",
        });
      } else if (entry.retryCount < 5) {
        entry.retryCount++;
        entry.status = "reconnecting";
        log.info(
          { sessionId, attempt: entry.retryCount },
          "Reconnecting..."
        );
        const delay = Math.min(entry.retryCount * 2000, 10000);
        setTimeout(() => startSession(sessionId), delay);
      } else {
        entry.status = "disconnected";
        log.error({ sessionId }, "Max retries reached");
        notifyFastAPI("status", {
          session_id: sessionId,
          status: "disconnected",
        });
      }
    }
  });

  sock.ev.on("messages.upsert", async ({ messages: msgs, type }) => {
    if (type !== "notify") return;
    for (const msg of msgs) {
      if (msg.key.fromMe) continue;

      const from = msg.key.remoteJid?.replace("@s.whatsapp.net", "") || "";
      if (!from || from.includes("@g.us")) continue;

      let msgType = "text";
      let body = "";
      let media = null;

      if (msg.message?.conversation) {
        body = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        body = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage) {
        msgType = "image";
        body = msg.message.imageMessage.caption || "";
        media = { mime_type: msg.message.imageMessage.mimetype };
      } else if (msg.message?.videoMessage) {
        msgType = "video";
        body = msg.message.videoMessage.caption || "";
        media = { mime_type: msg.message.videoMessage.mimetype };
      } else if (msg.message?.audioMessage) {
        msgType = "audio";
        media = { mime_type: msg.message.audioMessage.mimetype };
      } else if (msg.message?.documentMessage) {
        msgType = "document";
        body = msg.message.documentMessage.fileName || "";
        media = { mime_type: msg.message.documentMessage.mimetype };
      } else {
        continue;
      }

      const profileName = msg.pushName || "";

      notifyFastAPI("message", {
        source: "baileys",
        session_id: sessionId,
        from,
        message_id: msg.key.id,
        timestamp: msg.messageTimestamp,
        type: msgType,
        body,
        media,
        profile_name: profileName,
      });
    }
  });

  sock.ev.on("messages.update", async (updates) => {
    for (const update of updates) {
      if (!update.update?.status) continue;
      const statusMap = { 2: "delivered", 3: "delivered", 4: "read", 5: "played" };
      const status = statusMap[update.update.status];
      if (!status) continue;

      notifyFastAPI("status_update", {
        message_id: update.key.id,
        status,
        timestamp: Math.floor(Date.now() / 1000),
      });
    }
  });

  return entry;
}

async function stopSession(sessionId) {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  try {
    entry.socket?.end();
  } catch {}
  sessions.delete(sessionId);
}

function clearSessionFiles(sessionId) {
  const dir = path.join(SESSION_DIR, sessionId);
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function getAllSessions() {
  const result = [];
  for (const [id, entry] of sessions) {
    result.push({ session_id: id, status: entry.status });
  }
  return result;
}

async function notifyFastAPI(event, data) {
  const endpoints = {
    message: "/whatsapp/baileys-webhook",
    status_update: "/whatsapp/baileys-status-webhook",
    status: "/whatsapp/baileys-status-webhook",
  };

  const url = `${FASTAPI_URL}${endpoints[event]}`;
  const headers = {};
  if (BRIDGE_SECRET) headers["X-Bridge-Secret"] = BRIDGE_SECRET;

  try {
    await axios.post(url, data, { headers, timeout: 5000 });
  } catch (err) {
    log.error({ event, err: err.message }, "Failed to notify FastAPI");
  }
}

function toJid(phone) {
  const digits = phone.replace(/\D/g, "");
  return `${digits}@s.whatsapp.net`;
}

module.exports = {
  startSession,
  stopSession,
  getSession,
  getAllSessions,
  clearSessionFiles,
  toJid,
};
