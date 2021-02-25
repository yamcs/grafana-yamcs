import { SelectableValue } from '@grafana/data';
import { AsyncSelect, InlineField } from '@grafana/ui';
import { debounce } from 'lodash';
import React, { PureComponent } from 'react';
import { getDefaultStat } from '../queryInfo';
import { ListEventsQuery, ParameterInfo, ParameterSamplesQuery, QueryType, StatType, YamcsQuery } from '../types';
import { statRegistry, StatsPicker } from './StatsPicker';
import { YamcsQueryEditorProps } from './types';

type Props = YamcsQueryEditorProps<YamcsQuery | ParameterSamplesQuery | ListEventsQuery>;

interface State {
    parameter?: ParameterInfo;
    loading: boolean;
}

export class QueryEditorParameters extends PureComponent<Props, State> {
    state: State = {
        loading: true,
    };

    debouncedSearch: any;

    constructor(props: Props) {
        super(props);
        this.debouncedSearch = debounce(this.loadAsyncOptions, 300, {
            leading: true,
            trailing: true,
        });
    }

    async componentDidMount() {
        this.updateParameterInfo();
    }

    async componentDidUpdate(oldProps: Props) {
        const { query } = this.props;
        const parameterChanged = query?.parameter !== oldProps?.query?.parameter;
        if (parameterChanged) {
            if (!query.parameter) {
                this.setState({ parameter: undefined });
            } else {
                this.setState({ loading: true });
                this.updateParameterInfo();
            }
        }
    }

    loadAsyncOptions = (query: string) => {
        return this.props.datasource.yamcs.listParameters({
            q: query,
            limit: 20,
        }).then(page => {
            const result: Array<SelectableValue<string>> = [];
            for (const parameter of (page.parameters || [])) {
                result.push({
                    label: parameter.qualifiedName,
                    value: parameter.qualifiedName,
                    description: parameter.type?.engType.toUpperCase(),
                });
            }
            return result;
        });
    };

    private async updateParameterInfo() {
        const { query, datasource } = this.props;
        const update: State = { loading: false };
        const cache = datasource.getCache();
        if (query?.parameter) {
            update.parameter = await cache.getParameterInfo(query.parameter);
        }
        this.setState(update);
    }

    onParameterChange = (sel: SelectableValue<string>) => {
        const { onChange, query, onRunQuery } = this.props;
        let update: YamcsQuery = { ...query, parameter: sel?.value };
        // Make sure the selected aggregates are actually supported
        if (update.queryType === QueryType.ParameterSamples) {
            if (update.parameter) {
                const samplesUpdate = update as ParameterSamplesQuery;
                const info = this.state.parameter;
                if (!samplesUpdate.stats) {
                    samplesUpdate.stats = [];
                }
                if (info) {
                    samplesUpdate.stats = samplesUpdate.stats.filter(a => statRegistry.get(a).isValid(info));
                }
                if (!samplesUpdate.stats.length) {
                    samplesUpdate.stats = [getDefaultStat(info)];
                }
            }
        }
        onChange(update);
        onRunQuery();
    };

    onStatsChange = (stats: StatType[]) => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({ ...query, stats } as any);
        onRunQuery();
    };

    renderStatsRow(query: ParameterSamplesQuery) {
        const { parameter } = this.state;
        return (
            <div className="gf-form">
                <InlineField label="Stats" labelWidth={14} grow={true}>
                    <StatsPicker
                        stats={query.stats ?? []}
                        onChange={this.onStatsChange}
                        defaultStat={getDefaultStat(parameter)}
                        menuPlacement="bottom"
                    />
                </InlineField>
            </div>
        );
    }

    render() {
        /*const {query} = this.props;
        const { loading, parameter} = this.state;

        let currentParameter: ParameterInfo | undefined = undefined;
        if (!currentParameter && query.parameter) {
            if (loading) {
                    currentParameter = {
                        label: 'loading...',
                        value: query.parameter,
                    };
            } else if (parameter) {
                    currentParameter = {
                        label: parameter.value!,
                        value: query.parameter,
                        description: query.parameter,
                    };
            } else {
                    currentParameter = {
                        label: query.parameter,
                        value: query.parameter,
                    };
            }
        }*/

        return (
            <>
                <div className="gf-form">
                    <InlineField
                        labelWidth={14}
                        label="Parameter"
                        tooltip="Fully qualified name"
                        grow={true}>
                        <AsyncSelect
                            loadingMessage="Loading parameters..."
                            noOptionsMessage="Type to search"
                            loadOptions={this.debouncedSearch}
                            value={this.state.parameter}
                            onChange={this.onParameterChange}
                            placeholder="Select a parameter"
                            isClearable={true}
                            isSearchable={true}
                            allowCustomValue={false}
                        />
                    </InlineField>
                </div>
                {this.props.query?.queryType === QueryType.ParameterSamples
                    && this.renderStatsRow(this.props.query as any)}
            </>
        );
    };
}
