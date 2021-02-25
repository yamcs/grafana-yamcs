import { DataSourcePlugin } from '@grafana/data';
import { ConfigEditor } from './components/ConfigEditor';
import { QueryEditor } from './components/QueryEditor';
import { DataSource } from './DataSource';
import { YamcsOptions, YamcsQuery } from './types';

export const plugin = new DataSourcePlugin<DataSource, YamcsQuery, YamcsOptions>(DataSource)
  .setConfigEditor(ConfigEditor)
  .setQueryEditor(QueryEditor);
