import { DataSource } from './DataSource';
import { EngType, ParameterInfo, RawType } from './types';
import { ListParametersPage, Parameter } from './YamcsClient';

function mapToParameterInfo(parameter: Parameter): ParameterInfo {
    const rawType = (parameter.dataEncoding?.type || 'NO TYPE') as RawType;
    const engType = (parameter.type?.engType.toUpperCase() || 'NO TYPE') as EngType;

    let units = undefined;
    if (parameter.type?.unitSet) {
        units = parameter.type.unitSet.map(u => u.unit).join(' ');
    }

    let description = engType;
    if (units) {
        description += ' • ' + units;
    }

    return {
        label: parameter.qualifiedName,
        value: parameter.qualifiedName,
        description,
        engType,
        rawType,
        units,
    };
}

export class Dictionary {
    private loaded = false;
    private parametersById = new Map<string, ParameterInfo>();

    constructor(private dataSource: DataSource) {
    }

    async loadDictionary() {
        if (this.loaded) {
            return;
        }

        this.parametersById.clear();
        let page: ListParametersPage | null = null;
        while (!page || page.continuationToken) {
            if (!page) {
                page = await this.dataSource.yamcs.listParameters();
            } else {
                page = await this.dataSource.yamcs.listParameters({ next: page.continuationToken });
            }
            for (const parameter of (page.parameters || [])) {
                const info = mapToParameterInfo(parameter);
                this.parametersById.set(parameter.qualifiedName, info);
            }
        }
        this.loaded = true;
    }

    getParameterInfo(id: string): ParameterInfo {
        const v = this.parametersById.get(id);
        if (v) {
            return v;
        } else {
            throw 'parameter not found';
        }
    }
}
