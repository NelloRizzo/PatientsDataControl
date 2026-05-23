import type { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import * as measurementService from '../services/measurementService.js';
import { resolvePatientIds } from '../services/filterUtils.js';

export async function stats(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type, from, to, sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry } = req.query as Record<string, string>;
    if (!type) {
      res.status(400).json({ error: 'Type query parameter is required' });
      return;
    }

    const patientFilters = buildFilters({ sex, ageFrom, ageTo, homeCity, homeProvince, homeRegion, homeCountry, legalCity, legalProvince, legalRegion, legalCountry, filterLogic });
    const userIds = await resolvePatientIds(null, patientFilters);

    const filter: any = { type };
    if (userIds !== null) {
      filter.userId = { $in: userIds };
    }

    const result = await measurementService.getMeasurementStats(filter, type, {
      from, to,
    });
    res.json(result);
  } catch (error) {
    next(error);
  }
}

export async function timeseries(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const {
      type, groupBy = 'day', fields, from, to, aggregation,
      sex, ageFrom, ageTo, filterLogic,
      homeCity, homeProvince, homeRegion, homeCountry,
      legalCity, legalProvince, legalRegion, legalCountry,
    } = req.query as Record<string, string>;

    if (!type) {
      res.status(400).json({ error: 'Type query parameter is required' });
      return;
    }

    const patientFilters = buildFilters({ sex, ageFrom, ageTo, homeCity, homeProvince, homeRegion, homeCountry, legalCity, legalProvince, legalRegion, legalCountry, filterLogic });
    const userIds = await resolvePatientIds(null, patientFilters);

    const filter: any = { type };
    if (userIds !== null) {
      filter.userId = { $in: userIds };
    }

    const fieldList = fields ? fields.split(',').map((f: string) => f.trim()).filter(Boolean) : [];

    const result = await measurementService.getTimeSeries(
      filter, type, groupBy as any, fieldList, { from, to }, aggregation as any
    );
    res.json(result);
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
      const vals = value.split(',').map((v: string) => v.trim());
      conditions.push({ field, operator: 'in', value: vals });
    }
  }

  if (params.sex) {
    const sexes = params.sex.split(',').map((s: string) => s.trim());
    conditions.push({ field: 'sex', operator: 'in', value: sexes });
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
