require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize } = require('sequelize');
const { makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { DataTypes } = require('sequelize');
const jwt = require('jsonwebtoken');
const authConfig = require('./authConfig');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Koneksi ke MySQL dengan Sequelize
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false,
    }
);

// Test koneksi database
sequelize.authenticate()
    .then(() => console.log('Koneksi ke database berhasil!'))
    .catch(err => console.error('Gagal koneksi ke database:', err));

// Model pesan terkirim
const SentMessage = sequelize.define('sent_messages', {
  to: DataTypes.STRING,
  message: DataTypes.TEXT,
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Model pesan masuk
const ReceivedMessage = sequelize.define('received_messages', {
  from: DataTypes.STRING,
  message: DataTypes.TEXT,
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

// Import model autoReply
const AutoReply = require('./models/autoReply')(sequelize);

// Import model Contact
const Contact = require('./models/contact')(sequelize);

// Sinkronisasi model (letakkan di sini)
sequelize.sync()
  .then(() => console.log('Sinkronisasi model selesai!'))
  .catch(err => console.error('Gagal sinkronisasi model:', err));

// Variabel status chatbot
let chatbotActive = false;

// Endpoint sederhana
app.get('/', (req, res) => {
    res.json({ message: 'WhatsApp Gateway Backend Berjalan!' });
});

// Baileys WhatsApp
let sock = null;
let lastQr = null;
let isConnected = false; // Status koneksi WhatsApp

async function startWhatsApp() {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    sock = makeWASocket({
        auth: state,
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (connection === 'close') {
            isConnected = false;
            const shouldReconnect =
                lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            if (shouldReconnect) {
                startWhatsApp();
            }
        } else if (connection === 'open') {
            isConnected = true;
            lastQr = null; // QR tidak perlu ditampilkan lagi
            console.log('WhatsApp terhubung!');
        }
        if (qr) {
            lastQr = qr;
            isConnected = false;
            // Tampilkan QR code sebagai gambar di terminal
            qrcode.generate(qr, { small: true });
        }
    });

    // Modifikasi event messages.upsert dan endpoint /send-message untuk simpan pesan ke database
    // Pada event messages.upsert:
    sock.ev.on('messages.upsert', async (m) => {
        if (!m.messages || !m.messages[0]) return;
        const msg = m.messages[0];
        if (msg.key.fromMe) return; // Hanya pesan masuk
        const from = msg.key.remoteJid;
        const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        if (text) {
            await ReceivedMessage.create({ from, message: text });
            // Chatbot auto-reply
            if (chatbotActive) {
                // Cari auto reply dari database
                const auto = await AutoReply.findOne({ where: { keyword: text.toLowerCase() } });
                let reply = null;
                if (auto) reply = auto.reply;
                if (reply) {
                    await sock.sendMessage(from, { text: reply });
                    await SentMessage.create({ to: from, message: reply }); // Simpan auto-reply ke database
                }
            }
        }
    });
    // Pada endpoint /send-message:
    app.post('/send-message', async (req, res) => {
        const { to, message } = req.body;
        if (!sock) {
            return res.status(500).json({ status: 'error', message: 'WhatsApp belum terhubung' });
        }
        try {
            await sock.sendMessage(to, { text: message });
            await SentMessage.create({ to, message }); // Data pasti tersimpan
            res.json({ status: 'success', message: 'Pesan terkirim' });
        } catch (err) {
            res.status(500).json({ status: 'error', message: err.message });
        }
    });
}

startWhatsApp();

// Endpoint kirim pesan WhatsApp
// app.post('/send-message', async (req, res) => {
//     const { to, message } = req.body;
//     if (!sock) {
//         return res.status(500).json({ status: 'error', message: 'WhatsApp belum terhubung' });
//     }
//     try {
//         await sock.sendMessage(to, { text: message });
//         await SentMessage.create({ to, message });
//         res.json({ status: 'success', message: 'Pesan terkirim' });
//     } catch (err) {
//         res.status(500).json({ status: 'error', message: err.message });
//     }
// });

// Endpoint untuk ambil QR code
app.get('/get-qr', (req, res) => {
    if (lastQr) {
        res.json({ qr: lastQr });
    } else {
        res.status(404).json({ message: 'QR code belum tersedia' });
    }
});

// Endpoint untuk cek status koneksi WhatsApp
app.get('/status', (req, res) => {
    res.json({ connected: isConnected });
});

// Endpoint untuk logout/hapus sesi WhatsApp
const fs = require('fs');
app.post('/logout', (req, res) => {
    try {
        // Hapus folder auth_info_baileys agar sesi logout
        if (fs.existsSync('auth_info_baileys')) {
            fs.rmSync('auth_info_baileys', { recursive: true, force: true });
        }
        isConnected = false;
        lastQr = null;
        sock = null;
        // Restart koneksi WhatsApp
        startWhatsApp();
        res.json({ status: 'success', message: 'Sesi WhatsApp berhasil dihapus' });
    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
});

// Endpoint toggle chatbot
app.post('/chatbot-toggle', (req, res) => {
  chatbotActive = !chatbotActive;
  res.json({ status: 'success', active: chatbotActive });
});

// Endpoint ambil pesan terkirim
app.get('/sent-messages', async (req, res) => {
  const messages = await SentMessage.findAll({ order: [['timestamp', 'DESC']] });
  res.json(messages);
});

// Endpoint ambil pesan masuk
app.get('/received-messages', async (req, res) => {
  const messages = await ReceivedMessage.findAll({ order: [['timestamp', 'DESC']] });
  res.json(messages);
});

// CRUD Auto Reply
app.get('/auto-replies', async (req, res) => {
  const data = await AutoReply.findAll({ order: [['id', 'DESC']] });
  res.json(data);
});

app.post('/auto-replies', async (req, res) => {
  const { keyword, reply } = req.body;
  try {
    const created = await AutoReply.create({ keyword, reply });
    res.json({ status: 'success', data: created });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

app.put('/auto-replies/:id', async (req, res) => {
  const { id } = req.params;
  const { keyword, reply } = req.body;
  try {
    const updated = await AutoReply.update({ keyword, reply }, { where: { id } });
    res.json({ status: 'success', updated });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

app.delete('/auto-replies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await AutoReply.destroy({ where: { id } });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// CRUD untuk pesan terkirim
app.put('/sent-messages/:id', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  try {
    const updated = await SentMessage.update({ message }, { where: { id } });
    res.json({ status: 'success', updated });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});
app.delete('/sent-messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await SentMessage.destroy({ where: { id } });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});
// CRUD untuk pesan masuk
app.put('/received-messages/:id', async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  try {
    const updated = await ReceivedMessage.update({ message }, { where: { id } });
    res.json({ status: 'success', updated });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});
app.delete('/received-messages/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await ReceivedMessage.destroy({ where: { id } });
    res.json({ status: 'success' });
  } catch (err) {
    res.status(400).json({ status: 'error', message: err.message });
  }
});

// Middleware proteksi JWT
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  jwt.verify(token, authConfig.jwtSecret, (err, user) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });
    req.user = user;
    next();
  });
}

// Endpoint login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === authConfig.username && password === authConfig.password) {
    const token = jwt.sign({ username }, authConfig.jwtSecret, { expiresIn: authConfig.jwtExpire });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Username/password salah' });
  }
});

// Proteksi semua endpoint API (kecuali login, get-qr, status, /)
app.use((req, res, next) => {
  const openPaths = ['/', '/login', '/get-qr', '/status'];
  if (openPaths.includes(req.path) || req.path.startsWith('/public')) return next();
  authenticateToken(req, res, next);
});

// Import routes kontak
const contactsRouter = require('./routes/contacts')(Contact, authenticateToken);
app.use('/contacts', contactsRouter);

// Ekspor instance sequelize agar bisa diakses router
module.exports.sequelize = sequelize;

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});