import { InlineField, Input } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { ListEventsQuery, ParameterSamplesQuery, QueryType, YamcsQuery } from '../../types';
import { YamcsQueryEditorProps } from './types';

type Props = YamcsQueryEditorProps<YamcsQuery | ParameterSamplesQuery | ListEventsQuery>;

type State = {
  loading: boolean;
};

export class EventQueryEditor extends PureComponent<Props, State> {
  state: State = {
    loading: false,
  };

  onSourceChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;

    if (this.isListEventsQuery(query)) {
      const source = event.target.value || undefined; // Avoid empty string, set to undefined
      onChange({ ...query, source });
      onRunQuery();
    }
  };

  onTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { onChange, query, onRunQuery } = this.props;

    if (this.isListEventsQuery(query)) {
      const type = event.target.value || undefined; // Avoid empty string, set to undefined
      onChange({ ...query, type });
      onRunQuery();
    }
  };

  isListEventsQuery(query: YamcsQuery | ParameterSamplesQuery | ListEventsQuery): query is ListEventsQuery {
    return query.queryType === QueryType.ListEvents;
  }

  render() {
    const { query } = this.props;

    if (!this.isListEventsQuery(query)) {
      return null; // Don't render the inline fields if the query type is not ListEvents
    }

    return (
      <>
        <div className="gf-form">
          <InlineField label="Source" labelWidth={14} grow={true}>
            <Input
              value={query.source || ''} // Render undefined as an empty input
              placeholder="(Optional) Enter source"
              onChange={this.onSourceChange}
            />
          </InlineField>
        </div>
        <div className="gf-form">
          <InlineField label="Type" labelWidth={14} grow={true}>
            <Input
              value={query.type || ''} // Render undefined as an empty input
              placeholder="(Optional) Enter type"
              onChange={this.onTypeChange}
            />
          </InlineField>
        </div>
      </>
    );
  }
}
