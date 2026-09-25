const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const http = require('http');
const config = require('./config');

// Servidor HTTP simple para que Render reconozca el puerto activo
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('WaBotx v0.1 Online 24/7');
}).listen(PORT, () => {
  console.log(`🌐 Servidor activo en puerto ${PORT}`);
});

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Generar el código QR en la consola de Render
    if (qr) {
      console.log('📌 ESCANEA ESTE CÓDIGO QR CON TU WHATSAPP:');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('⚠️ Conexión cerrada. Reconectando...', shouldReconnect);
      if (shouldReconnect) startBot();
    } else if (connection === 'open') {
      console.log('✅ ¡WaBotx v0.1 conectado con éxito a WhatsApp!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text || '';

    // Comando .menu o .help
    if (text === '.menu' || text === '.help') {
      const menuData = config.getMenu();
      const imageBuffer = fs.readFileSync(menuData.image);

      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: menuData.sms1
      });

      await sock.sendMessage(from, { text: menuData.sms2 });
    }

    // Comando .masinfo o .moreinfo
    if (text === '.masinfo' || text === '.moreinfo') {
      const masInfoData = config.getMasInfo();
      await sock.sendMessage(from, { text: masInfoData.sms3 });
    }
  });
}

startBot();
