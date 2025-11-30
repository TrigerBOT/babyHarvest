import { NotFoundException } from '@nestjs/common';

export class PregnancyNotFoundError extends NotFoundException {
  constructor() {
    super({
      success: false,
      error: {
        code: 'PREGNANCY_NOT_FOUND',
        message: 'Pregnancy data not found. Please set up your pregnancy first.',
      },
    });
  }
}

