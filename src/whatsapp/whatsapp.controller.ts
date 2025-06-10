import {
  Controller,
  Post,
  Body,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Post('send-group')
  async sendToGroup(
    @Body() dto: { groupName: string; message: string }
  ): Promise<{ status: 'success'; group: string } | { status: 'error'; error: string }> {
    const { groupName, message } = dto;

    try {
      await this.whatsappService.sendMessageToGroupByName(groupName, message);
      return { status: 'success', group: groupName };
    } catch (err: any) {
      // Grupo no encontrado
      if (err.message?.includes('No se encontró grupo')) {
        throw new NotFoundException(err.message);
      }
      // Otros errores (conexión, Baileys, etc)
      throw new InternalServerErrorException('Error interno al enviar el mensaje');
    }
  }  
}
