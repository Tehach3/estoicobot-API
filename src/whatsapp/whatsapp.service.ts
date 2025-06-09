import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from '@whiskeysockets/baileys';

import * as qrcode from 'qrcode-terminal';
import Pino from 'pino';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private sock!: WASocket;
  private readonly log = new Logger(WhatsappService.name);
  private stopCredsSaver?: () => Promise<void>;

  async onModuleInit(): Promise<void> {
    const { state, saveCreds } = await useMultiFileAuthState('auth');
    this.stopCredsSaver = saveCreds;

    const { version } = await fetchLatestBaileysVersion();
    this.sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: Pino({ level: 'silent' }),
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on(
      'connection.update',
      ({ connection, lastDisconnect, qr }) => {
        if (qr) qrcode.generate(qr, { small: true });
        if (connection === 'open') this.log.log('✅ WhatsApp conectado');
        if (connection === 'close') {
          const code = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          this.log.warn(
            `Conexión cerrada (${code ?? 'desconocido'}). Reintentar: ${shouldReconnect}`,
          );
          if (shouldReconnect) void this.onModuleInit();
        }
      },
    );

    this.sock.ev.on('messages.upsert', ({ messages }) => {
      const m = messages[0];
      if (!m.key.fromMe && m.message?.conversation === '!ping') {
        void this.sendText(m.key.remoteJid!, 'pong 🏓');
      }
    });
  }

  async sendMessageToGroupByName(groupName: string, text: string): Promise<void> {
  const groups = await this.sock.groupFetchAllParticipating();

  const entry = Object.entries(groups).find(
    ([, meta]) => meta.subject === groupName
  );
  if (!entry) {
    throw new Error(`No se encontró grupo con nombre "${groupName}"`);
  }
  const [groupJid] = entry;

  await this.sock.sendMessage(groupJid, { text });
}

  async onModuleDestroy(): Promise<void> {
    await this.sock?.logout();
    await this.stopCredsSaver?.();
  }

  sendText(jid: string, text: string) {
    return this.sock.sendMessage(jid, { text });
  }
}
