const operators: { [key: string]: (a: any, b: any) => boolean } = {
  equals: (a, b) => {
    return a === b;
  },
  contains: (a, b) => {
    return typeof a === 'string' && a.indexOf(b) > -1;
  },
  startsWith: (a, b) => {
    return typeof a === 'string' && a.startsWith(b);
  },
  endsWith: (a, b) => {
    return typeof a === 'string' && a.endsWith(b);
  },
  matches: (a, b) => {
    return typeof a === 'string' && typeof b === 'string'
      && (new RegExp(b)).test(a);
  },
  in: (a, b) => {
    return typeof a === 'string' && Array.isArray(b)
      && b.indexOf(a) > -1;
  },
  notIn: (a, b) => {
    return typeof a === 'string' && Array.isArray(b)
      && b.indexOf(a) < 0;
  },
  before: (a, b) => {
    a = dateParse(a);
    b = dateParse(b);
    if (typeof a === 'number' && typeof b === 'number') {
      return a < b;
    }
    return false;
  },
  after: (a, b) => {
    a = dateParse(a);
    b = dateParse(b);
    if (typeof a === 'number' && typeof b === 'number') {
      return a > b;
    }
    return false;
  },
  greaterThan: (a, b) => {
    return a > b;
  },
  greaterThanOrEqual: (a, b) => {
    return a >= b;
  },
  lessThan: (a, b) => {
    return a < b;
  },
  lessThanOrEqual: (a, b) => {
    return a <= b;
  }
};

function dateParse(date: string | Date | number): number | string | Date {
  if (typeof date === 'string') {
    return Date.parse(date);
  }
  if (date instanceof Date) {
    return date.getTime();
  }
  return date;
}

const notFound = (): boolean => {
  return false;
};

export function test(op: string, a: any, b: any): boolean {
  // For 'in' and 'notIn' operators, b is an array
  // For all other operators (including 'before' and 'after'), b is a single value
  const isArrayOperator = ['in', 'notIn'].indexOf(op) >= 0;
  const value = isArrayOperator ? b : (Array.isArray(b) ? b[0] : b);
  return (operators[op] || notFound)(a, value);
}

