import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { extractFromImage, extractFromPdfText } from '../services/aiExtractService.js';
import { AppError } from '../middleware/errorHandler.js';

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/jpg'];
const PDF_MIME = 'application/pdf';

export async function extractMeasurements(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const file = req.file;
    if (!file) throw new AppError(400, 'File is required');

    const mime = file.mimetype.toLowerCase();

    let result;

    if (IMAGE_MIMES.includes(mime)) {
      result = await extractFromImage(file.buffer, mime);
    } else if (mime === PDF_MIME) {
      const { PDFParse }: any = await import('pdf-parse');
      const parser = new PDFParse({ data: file.buffer });
      await parser.load();
      const textResult = await parser.getText(1);
      parser.destroy();
      const text = textResult?.text || '';
      if (!text || text.trim().length < 10) {
        throw new AppError(400, 'Il PDF non contiene testo estraibile. Prova a caricare uno screenshot delle pagine.');
      }
      result = await extractFromPdfText(text.trim());
    } else {
      throw new AppError(400, `Formato file non supportato: ${mime}. Usa PNG, JPG o PDF.`);
    }

    res.json({ data: result });
  } catch (error) {
    next(error);
  }
}
