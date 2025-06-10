import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
  NotFoundException,
} from '@nestjs/common';

import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket,
} from '@whiskeysockets/baileys';

import type { Contact } from '@whiskeysockets/baileys';

import * as qrcode from 'qrcode-terminal';
import Pino from 'pino';

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private sock!: WASocket;
  private contacts = new Map<string, Contact>();
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
    this.sock.ev.on('contacts.upsert', (contacts: Contact[]) => {
      contacts.forEach(contact => this.contacts.set(contact.id, contact));
    });

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
        void this.sendText(m.key.remoteJid!, 'pong');
      }
    });
  }

  async sendMessageToGroupByName(groupName: string, text: string): Promise<void> {
    const groups = await this.sock.groupFetchAllParticipating();
    const entry = Object.entries(groups).find(([, m]) => m.subject === groupName);

    if (!entry) {
      throw new NotFoundException(`No se encontró grupo con nombre "${groupName}"`);
    }

    const [groupJid] = entry;
    await this.sock.sendMessage(groupJid, { text });
  }

  async sendMessageToContacts(
  names: string[],
  text: string
): Promise<{
  sent: string[];
  notFound: string[];
}> {

  this.log.log(
    'Contactos en caché:', 
    Array.from(this.contacts.values()).map(c => ({
      id: c.id,
      notify: c.notify,
      name: c.name
    }))
  );
  const sent: string[] = [];
  const notFound: string[] = [];

  for (const name of names) {
    // Busca en el caché
    const entry = Array.from(this.contacts.values())
      .find(c => c.notify === name || c.name === name);

    if (!entry) {
      notFound.push(name);
      continue;
    }

    try {
      await this.sock.sendMessage(entry.id, { text });
      sent.push(name);
    } catch {
      // Si falla el envío, lo tratamos como no enviado
      notFound.push(name);
    }
  }

  return { sent, notFound };
}

  async onModuleDestroy(): Promise<void> {
    await this.sock?.logout();
    await this.stopCredsSaver?.();
  }

  sendText(jid: string, text: string) {
    return this.sock.sendMessage(jid, { text });
  }
}
