import { DataSource } from './DataSource';
import { ParameterInfo } from './types';
import { ListParametersPage, Parameter } from './YamcsClient';

function mapToParameterInfo(parameter: Parameter): ParameterInfo {
    const engType = parameter.type?.engType.toUpperCase() || 'NO TYPE';
    let description = engType;
    if (parameter.type?.unitSet) {
        description += ' • '
        description += parameter.type.unitSet.map(u => u.unit).join(' ');
    }

    return {
        label: parameter.qualifiedName,
        value: parameter.qualifiedName,
        description,
        engType,
    };
}

export class YamcsCache {
    private loaded = false;
    private parametersById = new Map<string, ParameterInfo>();

    constructor(private dataSource: DataSource) {
    }

    async getParameterInfo(id: string): Promise<ParameterInfo> {
        await this.loadDictionary();

        const v = this.parametersById.get(id);
        if (v) {
            return v;
        } else {
            throw 'parameter not found';
        }
    }

    private async loadDictionary() {
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
}
