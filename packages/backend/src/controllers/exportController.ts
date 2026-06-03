import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { exportCsv } from '../services/exportService.js';
import { resolvePatientIds } from '../services/filterUtils.js';

export async function analystCsv(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      type, from, to,
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    } = req.query as Record<string, string>;

    const patientFilters = buildFilters({
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    });
    const userIds = await resolvePatientIds(null, patientFilters);

    const csv = await exportCsv({ type, from, to, userIds: userIds ?? undefined });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export-${type || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

export async function doctorCsv(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      type, from, to,
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    } = req.query as Record<string, string>;

    const patientFilters = buildFilters({
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    });
    const userIds = await resolvePatientIds(req.userId!, patientFilters);

    const csv = await exportCsv({ type, from, to, userIds: userIds ?? undefined });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="export-${type || 'all'}-${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
}

function buildFilters(params: {
  sex?: string; ageFrom?: string; ageTo?: string; filterLogic?: string;
  homeCity?: string; homeProvince?: string; homeRegion?: string; homeCountry?: string;
  legalCity?: string; legalProvince?: string; legalRegion?: string; legalCountry?: string;
}) {
  const conditions: any[] = [];

  const addrFields: Record<string, string | undefined> = {
    'homeAddress.city': params.homeCity,
    'homeAddress.province': params.homeProvince,
    'homeAddress.region': params.homeRegion,
    'homeAddress.country': params.homeCountry,
    'legalAddress.city': params.legalCity,
    'legalAddress.province': params.legalProvince,
    'legalAddress.region': params.legalRegion,
    'legalAddress.country': params.legalCountry,
  };

  for (const [field, value] of Object.entries(addrFields)) {
    if (value) {
      conditions.push({ field, operator: 'in', value: value.split(',').map((v) => v.trim()) });
    }
  }

  if (params.sex) {
    conditions.push({ field: 'sex', operator: 'in', value: params.sex.split(',').map((s) => s.trim()) });
  }

  if (params.ageFrom || params.ageTo) {
    const val = params.ageFrom && params.ageTo
      ? [parseInt(params.ageFrom), parseInt(params.ageTo)]
      : parseInt(params.ageFrom || params.ageTo || '0');
    conditions.push({
      field: 'age',
      operator: params.ageFrom && params.ageTo ? 'between' : params.ageFrom ? 'gte' : 'lte',
      value: val,
    });
  }

  if (conditions.length === 0) return undefined;
  return { logic: (params.filterLogic === 'or' ? 'or' : 'and') as 'and' | 'or', conditions };
}
