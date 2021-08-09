import { FieldType } from "@grafana/data";
import { EngType, RawType } from "./types";
import { Parameter, ParameterType } from "./YamcsClient";

export class DictionaryEntry {

    constructor(private parameter: Parameter) {
    }

    get name() {
        return this.parameter.qualifiedName + this.getEntryPath();
    }

    get shortName() {
        return this.parameter.name + this.getEntryPath();
    }

    get units() {
        const ptype = this.getParameterType();
        return ptype?.unitSet?.map(u => u.unit).join(' ');
    }

    get rawType() {
        const ptype = this.getParameterType();
        return (ptype?.dataEncoding?.type.toUpperCase() || 'NO TYPE') as RawType;
    }

    get engType() {
        const ptype = this.getParameterType();
        return (ptype?.engType.toUpperCase() || 'NO TYPE') as EngType;
    }

    get description() {
        let description = this.engType;
        const units = this.units;
        if (units) {
            description += ' • ' + units;
        }
        return description;
    }

    get grafanaFieldType() {
        switch (this.engType) {
            case 'FLOAT':
            case 'INTEGER':
                return FieldType.number;
            case 'BOOLEAN':
                return FieldType.boolean;
            case 'STRING':
            case 'ENUMERATION':
            case 'BINARY':
            case 'AGGREGATE':
            case 'ARRAY':
            case 'NO TYPE':
                return FieldType.string;
            case 'TIME':
                return FieldType.time;
            default:
                return FieldType.other;
        }
    }

    get grafanaRawFieldType() {
        switch (this.rawType) {
            case 'FLOAT':
            case 'INTEGER':
                return FieldType.number;
            case 'BOOLEAN':
                return FieldType.boolean;
            case 'STRING':
            case 'BINARY':
                return FieldType.string;
            default:
                return FieldType.other;
        }
    }

    /**
     * In case of an array or aggregate member, this returns
     * the path relative to the actual parameter name.
     * 
     * Note that aggregate members and array entries are not
     * full-fledged parameters, rather we make them look like
     * that. In truth, only the aggregate or array itself is
     * a parameter.
     */
    private getEntryPath() {
        let result = '';
        const { path } = this.parameter;
        if (path) {
            for (let i = 0; i < path.length; i++) {
                const el = path[i];
                if (el.startsWith('[')) {
                    result += el;
                } else {
                    result += '.' + el;
                }
            }
        }
        return result;
    }

    /**
     * Returns the ParameterType applicable to the parameter,
     * or a specific entry (in the case of array/aggregate
     * members)
     */
    private getParameterType() {
        if (!this.parameter.path) {
            return this.parameter.type;
        }
        let ptype = this.parameter.type!;
        for (const segment of this.parameter.path) {
            if (segment.startsWith('[')) {
                ptype = ptype.arrayInfo!.type;
            } else {
                for (const member of (ptype.member || [])) {
                    if (member.name === segment) {
                        ptype = member.type as ParameterType;
                        break;
                    }
                }
            }
        }
        return ptype;
    }
}
