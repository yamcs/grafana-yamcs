import { DataQuery, DataSourceJsonData } from '@grafana/data';

export interface MyQuery extends DataQuery {
  // variables
  param: string;
  selectedPath: string;
}

export const defaultQuery: Partial<MyQuery> = {
  // initial values
  param: 'No Parameter',
  selectedPath: '',
};

/**
 * These are options configured for each DataSource instance
 */
export interface MyDataSourceOptions extends DataSourceJsonData {
  host?: string;
  instance?: string;
  username?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
  apiKey?: string;
  password?: string;
}
