import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from 'baileys'
import { Boom } from '@hapi/boom'
import P from 'pino'
import qrcode from 'qrcode-terminal'

async function start() {
  /* 1️⃣  Persistencia de credenciales (multi-archivo de demo) */
  const { state, saveCreds } = await useMultiFileAuthState('./auth')

  /* 2️⃣  Obtén la versión más reciente que soporta WhatsApp Web */
  const { version } = await fetchLatestBaileysVersion()

  /* 3️⃣  Crea el socket */
  const sock = makeWASocket({
    version,
    logger: P({ level: 'info' }),
    printQRInTerminal: false, // usaremos qrcode-terminal
    auth: state,
  })

  /* 4️⃣  Manejamos eventos */
  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update

    /* Si llega un string QR ⇒ muéstralo */
    if (qr) qrcode.generate(qr, { small: true })

    /* Re-intento automático salvo cierre voluntario */
    if (connection === 'close') {
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !==
        DisconnectReason.loggedOut
      console.log('Socket cerrado. Reintentar:', shouldReconnect)
      if (shouldReconnect) await start()
    }

    if (connection === 'open') {
      console.log('✅ ¡Dispositivo vinculado con éxito!')
    }
  })
}

start()