import { FieldType } from "@grafana/data";
import { EngType, RawType } from "./types";
import { Parameter } from "./YamcsClient";

export class DictionaryEntry {

    constructor(private parameter: Parameter) {
    }

    get name() {
        return this.parameter.qualifiedName;
    }

    get shortName() {
        return this.parameter.name;
    }

    get units() {
        const { type } = this.parameter;
        if (type?.unitSet) {
            return type.unitSet.map(u => u.unit).join(' ');
        }
        return;
    }

    get rawType() {
        return (this.parameter.dataEncoding?.type || 'NO TYPE') as RawType;
    }

    get engType() {
        return (this.parameter.type?.engType.toUpperCase() || 'NO TYPE') as EngType;
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
        switch (this.parameter.dataEncoding?.type) {
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
}
