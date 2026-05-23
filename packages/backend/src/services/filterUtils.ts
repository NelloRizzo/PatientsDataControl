import { User } from '../models/User.js';
import type { PatientFilterGroup, PatientFilterCondition } from '@healthbridge/shared';

export async function resolvePatientIds(
  doctorId: string | null,
  patientFilters?: PatientFilterGroup
): Promise<string[] | null> {
  const userConditions: any[] = [];

  if (doctorId) {
    const { PatientDoctor } = await import('../models/PatientDoctor.js');
    const associations = await PatientDoctor.find({
      doctorId,
      status: 'active',
    }).lean();
    const associatedIds = associations.map((a: any) => a.patientId.toString());
    if (associatedIds.length === 0) return [];
    userConditions.push({ _id: { $in: associatedIds } });
  }

  if (patientFilters && patientFilters.conditions.length > 0) {
    const filterConditions = patientFilters.conditions.map((c: PatientFilterCondition) => {
      switch (c.field) {
        case 'sex':
          return { sex: buildOperator(c.operator, c.value) };
        case 'age':
          return buildAgeCondition(c.operator, c.value);
        case 'homeAddress.city':
        case 'homeAddress.province':
        case 'homeAddress.region':
        case 'homeAddress.country':
        case 'legalAddress.city':
        case 'legalAddress.province':
        case 'legalAddress.region':
        case 'legalAddress.country': {
          const query: any = {};
          query[c.field] = buildOperator(c.operator, c.value);
          return query;
        }
        default:
          return {};
      }
    });

    const filterQuery = patientFilters.logic === 'or'
      ? { $or: filterConditions }
      : { $and: filterConditions };

    if (userConditions.length === 0) {
      userConditions.push(filterQuery);
    } else {
      userConditions.push(filterQuery);
    }
  }

  if (userConditions.length === 0) return null;

  const combinedQuery = userConditions.length === 1
    ? userConditions[0]
    : { $and: userConditions };

  const users = await User.find(combinedQuery).select('_id').lean();
  return users.map((u: any) => u._id.toString());
}

function buildOperator(op: string, value: any): any {
  switch (op) {
    case 'eq': return value;
    case 'neq': return { $ne: value };
    case 'gt': return { $gt: value };
    case 'gte': return { $gte: value };
    case 'lt': return { $lt: value };
    case 'lte': return { $lte: value };
    case 'in': return { $in: Array.isArray(value) ? value : [value] };
    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        return { $gte: value[0], $lte: value[1] };
      }
      return value;
    default: return value;
  }
}

function buildAgeCondition(operator: string, value: any): any {
  const now = new Date();
  const currentYear = now.getFullYear();

  const ageToBirthDate = (age: number): Date => {
    return new Date(`${currentYear - age}-01-01`);
  };

  switch (operator) {
    case 'eq': {
      const start = ageToBirthDate(Number(value) + 1);
      const end = ageToBirthDate(Number(value));
      return { birthDate: { $gte: start, $lt: end } };
    }
    case 'gt': return { birthDate: { $lt: ageToBirthDate(Number(value)) } };
    case 'gte': return { birthDate: { $lte: ageToBirthDate(Number(value)) } };
    case 'lt': return { birthDate: { $gt: ageToBirthDate(Number(value) + 1) } };
    case 'lte': return { birthDate: { $gte: ageToBirthDate(Number(value) + 1) } };
    case 'between': {
      if (Array.isArray(value) && value.length === 2) {
        const start = ageToBirthDate(Number(value[1]) + 1);
        const end = ageToBirthDate(Number(value[0]));
        return { birthDate: { $gte: start, $lt: end } };
      }
      return {};
    }
    default: return {};
  }
}
