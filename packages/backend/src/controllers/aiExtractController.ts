import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { extractFromImage, extractFromPdfText } from '../services/aiExtractService.js';
import { AppError } from '../middleware/errorHandler.js';
import { t } from '../services/i18n.js';

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/jpg'];
const PDF_MIME = 'application/pdf';

export async function extractMeasurements(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw new AppError(400, t('error.file.required'));

    const mime = file.mimetype.toLowerCase();

    let result;

    if (IMAGE_MIMES.includes(mime)) {
      result = await extractFromImage(file.buffer, mime);
    } else if (mime === PDF_MIME) {
      const { PDFParse }: any = await import('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      await parser.load();
      const textResult = await parser.getText();
      parser.destroy();
      const text = textResult?.text || '';
      if (!text || text.trim().length < 10) {
        throw new AppError(400, t('error.file.noText'));
      }
      result = await extractFromPdfText(text.trim());
    } else {
      throw new AppError(400, t('error.file.unsupportedFormat', { format: mime }));
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
