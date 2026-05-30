import { env } from '../config/env.js';
import { MeasurementTypeConfig } from '../models/MeasurementTypeConfig.js';
import type { ExtractionResult, ExtractedField } from '@healthbridge/shared';

const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions';
const VISION_MODEL = 'llama-3.2-90b-vision-preview';
const TEXT_MODEL = 'llama-3.3-70b-versatile';

function imageToBase64(buffer: Buffer, mimeType: string): string {
  return buffer.toString('base64');
}

function buildMultiTypePrompt(typeConfigs: Array<{ key: string; name: string; fields: Array<{ key: string; name: string; unit: string; type: string }> }>): string {
  const typesDesc = typeConfigs.map(t =>
    `- "${t.key}" (${t.name}): fields = ${t.fields.map(f => `${f.key} (${f.name}, ${f.unit}, ${f.type})`).join(', ')}`
  ).join('\n');

  return `You are a medical data extraction assistant. Extract ALL measurement values from laboratory reports or medical documents.

Available measurement types:
${typesDesc}

Rules:
1. Identify ALL measurement types that match the document content
2. Extract numeric values for each field of those types
3. Return ONLY valid JSON with this exact structure — an ARRAY of objects:
[
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
]

4. Include EVERY measurement type found in the document, each as a separate entry
5. confidence (0-100): how reliable you think each extracted value is
   - 90-100: clearly printed, unambiguous
   - 70-89: readable but could be slightly off
   - 50-69: partially readable, needs verification
   - <50: uncertain, flag for manual review
6. Use the exact field keys and units from the type definition above
7. If a type has no identifiable values, omit it entirely
8. Do NOT include any text outside the JSON array`;
}

function buildTextPrompt(text: string, typeConfigs: any[]): string {
  const typesDesc = typeConfigs.map(t =>
    `- "${t.key}" (${t.name}): fields = ${t.fields.map((f: any) => `${f.key} (${f.name}, ${f.unit})`).join(', ')}`
  ).join('\n');

  return `Extract ALL medical measurement values from the following text extracted from a laboratory report.

Available measurement types:
${typesDesc}

Document text:
---
${text}
---

Return ONLY valid JSON with this exact structure — an ARRAY of objects:
[
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
]

Include EVERY measurement type found in the document. confidence (0-100): how reliable each value is.`;
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
      max_tokens: 4096,
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
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\[[\s\S]*\]/);
  const jsonStr = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
  return JSON.parse(jsonStr);
}

function evaluateConfidence(value: number, thresholds: { alertMin?: number; alertMax?: number; dangerMin?: number; dangerMax?: number }): { alertStatus: 'normal' | 'alert' | 'danger'; alertMessage?: string } {
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

function normalizeOne(
  item: any,
  typeConfigs: Array<{ key: string; name: string; fields: Array<{ key: string; name: string; unit: string; alertMin?: number; alertMax?: number; dangerMin?: number; dangerMax?: number }> }>,
): ExtractionResult {
  const config = typeConfigs.find(t => t.key === item.type);

  const fields: ExtractedField[] = (item.fields || []).map((f: any) => {
    let alertStatus: 'normal' | 'alert' | 'danger' = 'normal';
    let alertMessage: string | undefined;

    if (config) {
      const fieldCfg = config.fields.find(cf => cf.key === f.key);
      if (fieldCfg) {
        const evaluation = evaluateConfidence(f.value, fieldCfg);
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
    type: item.type || 'unknown',
    typeName: item.typeName || config?.name || 'Unknown',
    fields,
    notes: item.notes,
    overallConfidence,
  };
}

function normalizeResults(
  parsed: any,
  typeConfigs: any[],
): ExtractionResult[] {
  const items = Array.isArray(parsed) ? parsed : [parsed];
  return items
    .map((item: any) => normalizeOne(item, typeConfigs))
    .filter(r => r.type !== 'unknown' && r.fields.length > 0);
}

export async function extractFromImage(
  buffer: Buffer,
  mimeType: string,
): Promise<ExtractionResult[]> {
  const typeConfigs = await MeasurementTypeConfig.find({ active: true }).lean();
  if (!typeConfigs.length) throw new Error('No active measurement types found');

  const systemPrompt = buildMultiTypePrompt(typeConfigs as any);
  const base64 = imageToBase64(buffer, mimeType);

  const content: any[] = [
    { type: 'text', text: 'Extract ALL medical values from this document image.' },
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
  return normalizeResults(parsed, typeConfigs);
}

export async function extractFromPdfText(text: string): Promise<ExtractionResult[]> {
  const typeConfigs = await MeasurementTypeConfig.find({ active: true }).lean();
  if (!typeConfigs.length) throw new Error('No active measurement types found');

  const prompt = buildTextPrompt(text, typeConfigs);
  const raw = await callGroqApi([
    { role: 'system', content: 'You extract medical data and return only JSON arrays.' },
    { role: 'user', content: prompt },
  ], TEXT_MODEL);

  const parsed = parseJsonResponse(raw);
  return normalizeResults(parsed, typeConfigs);
}
