import { env } from '../config/env.js';
import { MeasurementTypeConfig } from '../models/MeasurementTypeConfig.js';
import type { ExtractionResult, ExtractedField } from '@healthbridge/shared';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = 'llama-3.2-90b-vision-preview';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

function imageToBase64(buffer: Buffer, mimeType: string): string {
  return buffer.toString('base64');
}

function buildSystemPrompt(typeConfigs: Array<{ key: string; name: string; fields: Array<{ key: string; name: string; unit: string; type: string }> }>): string {
  const typesDesc = typeConfigs.map(t =>
    `- "${t.key}" (${t.name}): fields = ${t.fields.map(f => `${f.key} (${f.name}, ${f.unit}, ${f.type})`).join(', ')}`
  ).join('\n');

  return `You are a medical data extraction assistant. Extract measurement values from laboratory reports or medical documents.

Available measurement types:
${typesDesc}

Rules:
1. Identify which measurement type matches the document content
2. Extract numeric values for each field of that type
3. Return ONLY valid JSON with this exact structure:
{
  "type": "measurement_type_key",
  "typeName": "Human readable name",
  "fields": [
    {
      "key": "field_key",
      "value": 123.45,
      "unit": "unit_string",
      "confidence": 85
    }
  ],
  "notes": "optional note about the extraction"
}

4. confidence (0-100): how reliable you think each extracted value is
   - 90-100: clearly printed, unambiguous
   - 70-89: readable but could be slightly off
   - 50-69: partially readable, needs verification
   - <50: uncertain, flag for manual review
5. Use the exact field keys and units from the type definition above
6. If you cannot determine the measurement type, set type to "unknown"
7. Do NOT include any text outside the JSON`;
}

function buildTextPrompt(text: string, typeConfigs: any[]): string {
  const typesDesc = typeConfigs.map(t =>
    `- "${t.key}" (${t.name}): fields = ${t.fields.map((f: any) => `${f.key} (${f.name}, ${f.unit})`).join(', ')}`
  ).join('\n');

  return `Extract medical measurement values from the following text extracted from a laboratory report.

Available measurement types:
${typesDesc}

Document text:
---
${text}
---

Return ONLY valid JSON with this exact structure:
{
  "type": "measurement_type_key",
  "typeName": "Human readable name",
  "fields": [
    {
      "key": "field_key",
      "value": 123.45,
      "unit": "unit_string",
      "confidence": 85
    }
  ],
  "notes": "optional note about the extraction"
}

confidence (0-100): how reliable you think each extracted value is.`;
}

async function callGroqApi(messages: Array<{ role: string; content: any }>, model: string): Promise<string> {
  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.groqApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`GROQ API error (${res.status}): ${errBody}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content || '';
}

function parseJsonResponse(text: string): any {
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
  return JSON.parse(jsonStr);
}

function evaluateConfidence(value: number, confidence: number, thresholds: { alertMin?: number; alertMax?: number; dangerMin?: number; dangerMax?: number }): { alertStatus: 'normal' | 'alert' | 'danger'; alertMessage?: string } {
  if (thresholds.dangerMin !== undefined && value < thresholds.dangerMin) {
    return { alertStatus: 'danger', alertMessage: `Valore ${value} sotto la soglia di pericolo (${thresholds.dangerMin})` };
  }
  if (thresholds.dangerMax !== undefined && value > thresholds.dangerMax) {
    return { alertStatus: 'danger', alertMessage: `Valore ${value} sopra la soglia di pericolo (${thresholds.dangerMax})` };
  }
  if (thresholds.alertMin !== undefined && value < thresholds.alertMin) {
    return { alertStatus: 'alert', alertMessage: `Valore ${value} sotto la soglia di attenzione (${thresholds.alertMin})` };
  }
  if (thresholds.alertMax !== undefined && value > thresholds.alertMax) {
    return { alertStatus: 'alert', alertMessage: `Valore ${value} sopra la soglia di attenzione (${thresholds.alertMax})` };
  }
  return { alertStatus: 'normal' };
}

export async function extractFromImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult> {
  const typeConfigs = await MeasurementTypeConfig.find({ active: true }).lean();
  if (!typeConfigs.length) throw new Error('No active measurement types found');

  const systemPrompt = buildSystemPrompt(typeConfigs as any);
  const base64 = imageToBase64(buffer, mimeType);

  const content: any[] = [
    { type: 'text', text: 'Extract medical values from this document image.' },
    {
      type: 'image_url',
      image_url: { url: `data:${mimeType};base64,${base64}` },
    },
  ];

  const raw = await callGroqApi([
    { role: 'system', content: systemPrompt },
    { role: 'user', content },
  ], VISION_MODEL);

  const parsed = parseJsonResponse(raw);
  return normalizeResult(parsed, typeConfigs as any);
}

export async function extractFromPdfText(text: string): Promise<ExtractionResult> {
  const typeConfigs = await MeasurementTypeConfig.find({ active: true }).lean();
  if (!typeConfigs.length) throw new Error('No active measurement types found');

  const prompt = buildTextPrompt(text, typeConfigs);
  const raw = await callGroqApi([
    { role: 'system', content: 'You extract medical data and return only JSON.' },
    { role: 'user', content: prompt },
  ], TEXT_MODEL);

  const parsed = parseJsonResponse(raw);
  return normalizeResult(parsed, typeConfigs as any);
}

function normalizeResult(
  parsed: any,
  typeConfigs: Array<{ key: string; name: string; fields: Array<{ key: string; name: string; unit: string; alertMin?: number; alertMax?: number; dangerMin?: number; dangerMax?: number; min?: number; max?: number }> }>,
): ExtractionResult {
  const config = typeConfigs.find(t => t.key === parsed.type);

  const fields: ExtractedField[] = (parsed.fields || []).map((f: any) => {
    let alertStatus: 'normal' | 'alert' | 'danger' = 'normal';
    let alertMessage: string | undefined;

    if (config) {
      const fieldCfg = config.fields.find(cf => cf.key === f.key);
      if (fieldCfg) {
        const evaluation = evaluateConfidence(f.value, f.confidence || 0, fieldCfg);
        alertStatus = evaluation.alertStatus;
        alertMessage = evaluation.alertMessage;
      }
    }

    return {
      key: f.key,
      value: f.value,
      unit: f.unit,
      confidence: Math.min(100, Math.max(0, f.confidence || 0)),
      alertStatus,
      alertMessage,
    };
  });

  const overallConfidence = fields.length > 0
    ? Math.round(fields.reduce((s: number, f: ExtractedField) => s + f.confidence, 0) / fields.length)
    : 0;

  return {
    type: parsed.type || 'unknown',
    typeName: parsed.typeName || config?.name || 'Unknown',
    fields,
    notes: parsed.notes,
    overallConfidence,
  };
}
