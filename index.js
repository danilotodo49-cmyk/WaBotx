const { 
  default: makeWASocket, 
  useMultiFileAuthState, 
  DisconnectReason 
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const config = require('./config');

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');

  const sock = makeWASocket({
    logger: pino({ level: 'silent' }),
    printQRInTerminal: true,
    auth: state
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
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

      // 1. Envía la foto con Sms1
      await sock.sendMessage(from, {
        image: imageBuffer,
        caption: menuData.sms1
      });

      // 2. Envía el Sms2 automático
      await sock.sendMessage(from, { text: menuData.sms2 });
    }

    // Comando .masinfo o .moreinfo
    if (text === '.masinfo' || text === '.moreinfo') {
      const masInfoData = config.getMasInfo();

      // 3. Envía el Sms3
      await sock.sendMessage(from, { text: masInfoData.sms3 });
    }
  });
}

startBot();
