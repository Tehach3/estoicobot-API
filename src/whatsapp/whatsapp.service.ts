// src/whatsapp/whatsapp.service.ts
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
import Boom = require("@hapi/boom")

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
          // Usamos el tipo Boom directamente
          const code =
            (lastDisconnect?.error as (Boom | undefined))?.output
              ?.statusCode;
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

  async onModuleDestroy(): Promise<void> {
    await this.sock?.logout();
    await this.stopCredsSaver?.();
  }

  sendText(jid: string, text: string) {
    return this.sock.sendMessage(jid, { text });
  }
}
