import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface YamcsOptions extends DataSourceJsonData {
  instance?: string;
}

export interface Instance {
  name: string;
}

export interface ParameterQuery extends DataQuery {
  parameter: string;
}

export interface Parameter {
  name: string;
  qualifiedName: string;
}

export interface ListParametersOptions {
  q?: string;
  limit?: number;
  next?: string;
}

export interface ListParametersPage {
  spaceSystems?: string[];
  parameters?: Parameter[];
  continuationToken?: string;
}

export interface SampleOptions {
  start: string;
  stop: string;
  count?: number;
}

export interface Sample {
  time: string;
  avg: number;
}

export interface Samples {
  sample: Sample[];
}
