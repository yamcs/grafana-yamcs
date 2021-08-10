import { DataSource } from 'DataSource';
import { YamcsQuery } from '../../types';

export interface YamcsQueryEditorProps<T extends YamcsQuery = YamcsQuery> {
  datasource: DataSource;
  query: T;
  onRunQuery: () => void;
  onChange: (value: T) => void;
}
