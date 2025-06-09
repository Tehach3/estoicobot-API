import { Controller, Post, Body } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { Public } from '../auth/public.decorator';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Public()
  @Post('send')
  sendMessage(@Body() body: { groupName: string; message: string }) {
    const { groupName, message } = body;
    return this.whatsappService.sendMessageToGroupByName(groupName, message);
  }
}
