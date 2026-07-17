import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import { Response } from 'express';
import { ProductsService } from './products.service';

/**
 * Отдача фото товара. Без авторизации — <img> не умеет слать Bearer-заголовок;
 * UUID неугадываем, фото товара — не чувствительные данные.
 */
@Controller('products')
export class ProductPhotoController {
  constructor(private readonly productsService: ProductsService) {}

  @Get(':id/photo')
  async photo(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const { buf, mime } = await this.productsService.getPhoto(id);
    res.set({
      'Content-Type': mime,
      'Content-Length': String(buf.length),
      'Cache-Control': 'public, max-age=604800, immutable',
    });
    res.send(buf);
  }
}
