import { InlineField, Input } from '@grafana/ui';
import { debounce } from 'lodash';
import React, { PureComponent } from 'react';
import { ListEventsQuery, ParameterSamplesQuery, QueryType, YamcsQuery } from '../../types';
import { YamcsQueryEditorProps } from './types';

type Props = YamcsQueryEditorProps<YamcsQuery | ParameterSamplesQuery | ListEventsQuery>;

interface State {
  source?: string;
  type?: string;
}

export class EventQueryEditor extends PureComponent<Props, State> {
  state: State;

  constructor(props: Props) {
    super(props);
    const { query } = this.props;
    if (this.isListEventsQuery(query)) {
      this.state = {
        source: query.source || undefined,
        type: query.type || undefined,
      };
    } else {
      this.state = {};
    }
  }

  onSourceChange = debounce((value: string | undefined) => {
    const { onChange, query, onRunQuery } = this.props;

    if (this.isListEventsQuery(query)) {
      const newSource = value || undefined; // Avoid empty string, set to undefined
      const changed = newSource !== this.state.source;
      this.setState({ source: newSource }, () => {
        if (changed) {
          onChange({ ...query, source: newSource });
          onRunQuery();
        }
      });
    }
  }, 300);

  onTypeChange = debounce((value: string | undefined) => {
    const { onChange, query, onRunQuery } = this.props;

    if (this.isListEventsQuery(query)) {
      const newType = value || undefined; // Avoid empty string, set to undefined
      const changed = newType !== this.state.type;
      this.setState({ type: newType }, () => {
        if (changed) {
          onChange({ ...query, type: newType });
          onRunQuery();
        }
      });
    }
  }, 300);

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
              defaultValue={this.state.source}
              placeholder="(Optional) Filter by source"
              onChange={(evt) => this.onSourceChange((evt.target as any).value)}
            />
          </InlineField>
        </div>
        <div className="gf-form">
          <InlineField label="Type" labelWidth={14} grow={true}>
            <Input
              defaultValue={this.state.type}
              placeholder="(Optional) Filter by type"
              onChange={(evt) => this.onTypeChange((evt.target as any).value)}
            />
          </InlineField>
        </div>
      </>
    );
  }
}
