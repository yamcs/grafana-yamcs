import { Value } from './YamcsClient';

const PREVIEW_LENGTH = 5;

export function printValue(value: Value) {
  if (value.type === 'AGGREGATE') {
    let preview = '{';
    if (value.aggregateValue) {
      const n = Math.min(value.aggregateValue.name.length, PREVIEW_LENGTH);
      for (let i = 0; i < n; i++) {
        if (i !== 0) {
          preview += ', ';
        }
        preview += value.aggregateValue.name[i] + ': ' + printValueWithoutPreview(value.aggregateValue.value[i]);
      }
      if (n < value.aggregateValue.value.length) {
        preview += `, …`;
      }
    }
    return preview + '}';
  } else if (value.type === 'ARRAY') {
    let preview = '[';
    if (value.arrayValue) {
      const n = Math.min(value.arrayValue.length, PREVIEW_LENGTH);
      for (let i = 0; i < n; i++) {
        if (i !== 0) {
          preview += ', ';
        }
        preview += printValueWithoutPreview(value.arrayValue[i]);
      }
      if (n < value.arrayValue.length) {
        preview += ', …';
      }
      preview += `] (${value.arrayValue.length})`;
    } else {
      preview += '] (0)';
    }
    return preview;
  } else {
    return printValueWithoutPreview(value);
  }
}

function printValueWithoutPreview(value: Value): string {
  switch (value.type) {
    case 'AGGREGATE':
      return 'aggregate';
    case 'ARRAY':
      return 'array';
    case 'BOOLEAN':
      return '' + value.booleanValue;
    case 'FLOAT':
      return '' + value.floatValue;
    case 'DOUBLE':
      return '' + value.doubleValue;
    case 'UINT32':
      return '' + value.uint32Value;
    case 'SINT32':
      return '' + value.sint32Value;
    case 'BINARY':
      return printHexPreview('' + value.binaryValue);
    case 'ENUMERATED':
    case 'STRING':
      return value.stringValue!;
    case 'TIMESTAMP':
      return printDateTime(value.stringValue!);
    case 'UINT64':
      return '' + value.uint64Value;
    case 'SINT64':
      return '' + value.sint64Value;
    case 'NONE':
      return '';
    default:
      return 'Unsupported data type';
  }
}

export function printHexPreview(binaryValue: string) {
  const hex = convertBase64ToHex(binaryValue);
  if (hex.length > 32) {
    return '0x' + hex.slice(0, 32) + '…';
  } else if (hex.length > 0) {
    return '0x' + hex;
  } else {
    return '';
  }
}

export function printDateTime(date: Date | string, addTimezone = true): string {
  let dateString;
  if (typeof date === 'string') {
    // Convert to date first, this standardizes output (millis precision)
    dateString = toDate(date).toISOString();
  } else {
    dateString = date.toISOString();
  }
  return dateString.replace('T', ' ').replace('Z', addTimezone ? ' UTC' : '');
}

export function convertBase64ToHex(base64: string) {
  const raw = atob(base64);
  let result = '';
  for (let i = 0; i < raw.length; i++) {
    const hex = raw.charCodeAt(i).toString(16);
    result += hex.length === 2 ? hex : '0' + hex;
  }
  return result;
}

export function toDate(obj: any): Date {
  if (!obj) {
    return obj;
  }

  if (obj instanceof Date) {
    return obj;
  } else if (typeof obj === 'number') {
    return new Date(obj);
  } else if (typeof obj === 'string') {
    if (!obj.endsWith('Z')) {
      obj = obj + 'Z';
    }
    return new Date(Date.parse(obj));
  } else {
    throw new Error(`Cannot convert '${obj}' to Date`);
  }
}
