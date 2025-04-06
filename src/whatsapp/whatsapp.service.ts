import { Injectable, OnModuleInit } from '@nestjs/common';
import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import { makeInMemoryStore } from '@whiskeysockets/baileys/lib/store';
import { debug } from 'console';
import * as qrcode from 'qrcode-terminal';
import * as fs from 'fs';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

export class WhatsappService implements OnModuleInit {
  private sock: ReturnType<typeof makeWASocket>;
  private store = makeInMemoryStore({});
  private started = false;


  async onModuleInit() {
    await this.start();
  }

  async start() {
    const authDir = './auth';
    if (this.started) return;
    this.started = true;
    console.log('status qr generade ',this.started)
    
    if (fs.existsSync(authDir)) {
      fs.rmSync(authDir, { recursive: true, force: true });
      console.log('Directorio de autenticación limpiado.');
    }
    const { state, saveCreds } = await useMultiFileAuthState(authDir);

    this.store.readFromFile('./baileys_store.json');
    setInterval(() => this.store.writeToFile('./baileys_store.json'), 10_000);

    this.sock = makeWASocket({
      auth: state,
      // Aunque pongas esto, en algunas versiones no imprime
      // printQRInTerminal: true,
    });

    this.sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
    
      if (connection === 'close') {
        const error = lastDisconnect?.error;
        console.error('❌ Se cerró la conexión:', error);
    
        // Si querés reintentar o manejar el error de forma automática, podés hacerlo acá.
      }
    });

    this.store.bind(this.sock.ev);

    this.sock.ev.on('creds.update', saveCreds);

    // ✅ Aquí escuchamos los cambios de conexión
    this.sock.ev.on('connection.update', (update) => {
      console.log('connection.update:', update);
      const { connection, qr } = update;
      if (qr) {
        console.log('QR recibido:', qr);
        qrcode.generate(qr, { small: true });
      }
      if (connection === 'open') {
        console.log('✅ Conexión establecida');
      }
    });
  }

  // Método para buscar y enviar mensaje a un grupo por su nombre
  async sendMessageToGroupByName(groupName: string, message: string) {
    // Usamos Object.entries para recorrer los chats que están en el store
    for (const [jid, chatUnknown] of Object.entries(this.store.chats)) {
      // Forzamos el tipado del chat, al menos con la propiedad 'name'
      const chat = chatUnknown as { name?: string };

      // Verificamos que sea un grupo (termina con '@g.us') y que el nombre coincida
      if (jid.endsWith('@g.us') && chat.name === groupName) {
        console.log(`Enviando mensaje al grupo ${chat.name} (${jid})`);
        return this.sock.sendMessage(jid, { text: message });
      }
    }
    throw new Error(`Grupo con nombre "${groupName}" no encontrado`);
  }
}
