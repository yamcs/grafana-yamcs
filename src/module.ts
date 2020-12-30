import { DataSourcePlugin } from '@grafana/data';
import { ConfigEditor } from './ConfigEditor';
import { DataSource } from './DataSource';
import { QueryEditor } from './QueryEditor';
import { ParameterQuery, YamcsOptions } from './types';

export const plugin = new DataSourcePlugin<DataSource, ParameterQuery, YamcsOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
