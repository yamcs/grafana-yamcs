import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface YamcsOptions extends DataSourceJsonData {
  instance?: string;
}

export enum QueryType {
  ListEvents = 'ListEvents',
  ParameterValue = 'ParameterValue',
  ParameterValueHistory = 'ParameterValueHistory',
  ParameterSamples = 'ParameterSamples',
  ParameterRanges = 'ParameterRanges',
}

export enum ValueKind {
  RAW = 'RAW',
  ENGINEERING = 'ENGINEERING',
}

export enum StatType {
  AVG = 'AVG',
  COUNT = 'COUNT',
  MAX = 'MAX',
  MIN = 'MIN',
}

export interface YamcsQuery extends DataQuery {
  queryType: QueryType;
  parameter?: string;
  maxPages?: number;
}

export interface ParameterSamplesQuery extends YamcsQuery {
  queryType: QueryType.ParameterSamples;
  stats: StatType[];
  valueKind?: ValueKind;
}

export interface ParameterRangesQuery extends YamcsQuery {
  queryType: QueryType.ParameterRanges;
}

export interface ParameterValueQuery extends YamcsQuery {
  queryType: QueryType.ParameterValue;
  valueKind?: ValueKind;
}

export interface ParameterValueHistoryQuery extends YamcsQuery {
  queryType: QueryType.ParameterValueHistory;
}

export interface ListEventsQuery extends YamcsQuery {
  queryType: QueryType.ListEvents;
  source?: string;
}

export type EngType =
  | 'AGGREGATE'
  | 'ARRAY'
  | 'BINARY'
  | 'BOOLEAN'
  | 'ENUMERATION'
  | 'FLOAT'
  | 'INTEGER'
  | 'NO TYPE'
  | 'STRING'
  | 'TIME';

export type RawType = 'BINARY' | 'BOOLEAN' | 'FLOAT' | 'INTEGER' | 'STRING';
