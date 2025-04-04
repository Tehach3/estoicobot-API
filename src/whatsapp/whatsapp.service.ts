import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';

export class WhatsappService {
  
  [x: string]: any;
  private sock: ReturnType<typeof makeWASocket>;

  async start() {
    const { state, saveCreds } = await useMultiFileAuthState('./auth');

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: true,
    });

    this.sock.ev.on('creds.update', saveCreds);

    this.sock.ev.on('messages.upsert', async ({ messages }) => {
      const msg = messages[0];
      const text = msg.message?.conversation;
      if (text?.toLowerCase() === 'hola') {
        await this.sock.sendMessage(msg.key.remoteJid!, { text: '¡Hola desde Nest con multi-auth!' });
      }
    });
  }

  async sendMessage(chatId: string, message: string) {
    const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
    return this.sock.sendMessage(jid, { text: message });
  }

  async sendMessageToChat(chatId: string, message: string) {
    const jid = chatId.includes('@') ? chatId : `${chatId}@s.whatsapp.net`;
    return this.sock.sendMessage(jid, { text: message });
  }

  async sendMessageToGroupByName(groupName: string, message: string) {
    const chats = this.store.chats;
    for (const [jid, chat] of Object.entries(this.store.chats) as [string, { name?: string }][]) {
      if (jid.endsWith('@g.us') && chat.name === groupName) {
        return this.sock.sendMessage(jid, { text: message });
      }
    }

  
    throw new Error(`Grupo con nombre "${groupName}" no encontrado`);
  }
}
