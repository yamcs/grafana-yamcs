import { CompletionItemGroup, InlineField, TypeaheadOutput } from '@grafana/ui';
import React, { PureComponent } from 'react';
import { Dictionary } from '../../Dictionary';
import { migrateQuery } from '../../migrations';
import { ListEventsQuery, ParameterInfo, ParameterSamplesQuery, QueryType, StatType, YamcsQuery } from '../../types';
import { AutocompleteField } from '../AutocompleteField/AutocompleteField';
import { ConversionRow } from './ConversionRow';
import { StatsPicker } from './StatsPicker';
import { YamcsQueryEditorProps } from './types';

type Props = YamcsQueryEditorProps<YamcsQuery | ParameterSamplesQuery | ListEventsQuery>;

interface State {
    parameter?: ParameterInfo;
    loading: boolean;
}

export class ParameterQueryEditor extends PureComponent<Props, State> {
    state: State = {
        loading: true,
    };

    dictionary?: Dictionary;

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

    onTypeahead = async (input: string): Promise<TypeaheadOutput> => {
        const suggestions = await this.suggestParameters(input);
        return { suggestions };
    }

    private async suggestParameters(q: string): Promise<CompletionItemGroup[]> {
        const page = await this.props.datasource.yamcs.listParameters({
            q,
            limit: 15,
            searchMembers: true,
        });

        // Group by space system
        const groups = new Map<String, CompletionItemGroup>();
        for (const parameter of (page.parameters || [])) {
            const spaceSystem = this.extractSpacesystem(parameter.qualifiedName);
            let group = groups.get(spaceSystem);
            if (!group) {
                group = {
                    label: spaceSystem,
                    items: [],
                };
                groups.set(spaceSystem, group);
            }
            let path = '';
            for (const segment of parameter.path || []) {
                if (segment.startsWith('[')) {
                    path += segment;
                } else {
                    path += '.' + segment;
                }
            }
            group.items.push({
                label: parameter.name + path,
                filterText: (parameter.qualifiedName + path).toLowerCase(),
                insertText: parameter.qualifiedName + path,
                documentation: parameter.longDescription || parameter.shortDescription,
            })
        }
        return [...groups.values()];
    }

    private extractSpacesystem(qualifiedName: string) {
        const idx = qualifiedName.lastIndexOf('/');
        return (idx === -1) ? qualifiedName : qualifiedName.substring(0, idx);
    }

    private async updateParameterInfo() {
        const { query, datasource } = this.props;
        const update: State = { loading: false };
        if (query?.parameter) {
            const dictionary = await datasource.loadDictionary();
            update.parameter = dictionary.getParameterInfo(query.parameter);
        }
        this.setState(update);
    }

    onParameterChange = (parameter?: string) => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({ ...query, parameter });
        onRunQuery();
    };

    onStatsChange = (stats: StatType[]) => {
        const { onChange, query, onRunQuery } = this.props;
        onChange({ ...query, stats } as any);
        onRunQuery();
    };

    renderStatsRow(query: ParameterSamplesQuery) {
        return (
            <div className="gf-form">
                <InlineField label="Stats" labelWidth={14} grow={true}>
                    <StatsPicker
                        stats={query.stats ?? []}
                        onChange={this.onStatsChange}
                        menuPlacement="bottom"
                    />
                </InlineField>
            </div>
        );
    }

    render() {
        const query = migrateQuery(this.props.query);
        const showStats = query.parameter && query.queryType === QueryType.ParameterSamples;
        const showConversion = query.parameter && (
            query.queryType === QueryType.ParameterSamples ||
            query.queryType === QueryType.ParameterValue);
        return (
            <>
                <div className="gf-form">
                    <InlineField
                        labelWidth={14}
                        label="Parameter"
                        tooltip="Fully qualified name"
                        grow={true}>
                        <AutocompleteField
                            onTypeahead={this.onTypeahead}
                            onSelectSuggestion={this.onParameterChange}
                            onBlur={this.onParameterChange}
                            placeholder="Type to search"
                            query={query.parameter}
                        />
                    </InlineField>
                </div>
                {showStats && this.renderStatsRow(query as any)}
                {showConversion && <ConversionRow {...(this.props as any)} />}
            </>
        );
    };
}
