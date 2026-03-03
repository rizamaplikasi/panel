const { 
    makeWASocket, 
    useMultiFileAuthState, 
    DisconnectReason, 
    makeInMemoryStore 
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const qrcode = require('qrcode-terminal');

async function startBot() {
    // Menyimpan sesi agar tidak perlu scan ulang setiap restart
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');

    const sock = makeWASocket({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true, // QR akan muncul di log terminal/Heroku
        auth: state,
        browser: ['Ryzz AI Panel', 'Safari', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('--- SCAN QR DI BAWAH INI ---');
            qrcode.generate(qr, { small: true });
        }

        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus, mencoba menghubungkan kembali:', shouldReconnect);
            if (shouldReconnect) startBot();
        } else if (connection === 'open') {
            console.log('✅ Bot Berhasil Terhubung!');
        }
    });

    // Logika Respon Pesan
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;

        const from = m.key.remoteJid;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";

        // Jika seseorang mengirim pesan "p"
        if (body.toLowerCase() === 'p') {
            const sentMsg = await sock.sendMessage(from, { 
                text: "Ada yang bisa saya bantu?\n\n1. Iya, perlu dengan Fathur Rizam\n2. Iya, perlu dengan Ryzz AI\n\n_Silahkan balas dengan angka atau ketik keperluan Anda._" 
            });
        }
    });
}

// Menjalankan Bot
startBot();

