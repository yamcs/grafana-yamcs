import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrvRequest, getBackendSrv } from '@grafana/runtime';
import { YamcsOptions } from './types';

export interface Parameter {
    name: string;
    qualifiedName: string;
    type?: ParameterType;
    shortDescription?: string;
    longDescription?: string;
}

export interface ParameterType {
    engType: string;
    unitSet: UnitInfo[];
}

export interface UnitInfo {
    unit: string;
}

export interface Instance {
    name: string;
}

export interface ListParametersOptions {
    q?: string;
    limit?: number;
    next?: string;
}

export interface ListParametersPage {
    spaceSystems?: string[];
    parameters?: Parameter[];
    continuationToken?: string;
}

export interface Event {
    generationTime: string;
    receptionTime: string;
    source: string;
    seqNumber: number;
    type: string;
    message: string;
    severity: string;
}

export interface ListEventsOptions {
    start?: string;
    stop?: string;
    q?: string;
    source?: string;
    next?: string;
}

export interface ListEventsPage {
    event?: Event[];
    continuationToken?: string;
}

export interface SampleOptions {
    start: string;
    stop: string;
    count?: number;
}

export interface Sample {
    time: string;
    avg: number;
    min: number;
    max: number;
    n: number;
}

export interface Samples {
    sample: Sample[];
}

export interface ParameterValue {
    engValue: Value;
    generationTime: string;
    acquisitionTime: string;
    acquisitionStatus: string;
    processingStatus: boolean;
    monitoringResult: string;
    rangeCondition: string;
}

export interface Value {
    type: Type;
    floatValue: number;
    doubleValue: number;
    sint32Value: number;
    uint32Value: number;
    binaryValue: string;  // Base64
    stringValue: string;
    timestampValue: string;  // String decimal
    uint64Value: string;  // String decimal
    sint64Value: string;  // String decimal
    booleanValue: boolean;
    aggregateValue: AggregateValue;
    arrayValue: Value[];
}

export interface AggregateValue {
    name: string[];
    value: Value[];
}

export enum Type {
    FLOAT = "FLOAT",
    DOUBLE = "DOUBLE",
    UINT32 = "UINT32",
    SINT32 = "SINT32",
    BINARY = "BINARY",
    STRING = "STRING",
    TIMESTAMP = "TIMESTAMP",
    UINT64 = "UINT64",
    SINT64 = "SINT64",
    BOOLEAN = "BOOLEAN",
    AGGREGATE = "AGGREGATE",
    ARRAY = "ARRAY",
    ENUMERATED = "ENUMERATED",
    NONE = "NONE",
}

export class YamcsClient {

    private instance: string;

    constructor(private settings: DataSourceInstanceSettings<YamcsOptions>) {
        this.instance = settings.jsonData.instance!;
    }

    async fetchInstance(): Promise<Instance> {
        const encodedInstance = encodeURIComponent(this.instance);
        const response = await this.doRequest<Instance>({
            method: 'GET',
            url: `/api/instances/${encodedInstance}`,
        });
        return response.data;
    }

    async getParameterValue(parameter: string): Promise<ParameterValue> {
        const encodedInstance = encodeURIComponent(this.instance);
        const encodedName = encodeURIComponent(parameter);
        const response = await this.doRequest<ParameterValue>({
            method: 'GET',
            url: `/api/processors/${encodedInstance}/realtime/parameters${encodedName}`,
        });
        return response.data;
    }

    async sampleParameter(parameter: string, options: SampleOptions): Promise<Sample[]> {
        const encodedInstance = encodeURIComponent(this.instance);
        const encodedName = encodeURIComponent(parameter);
        const response = await this.doRequest<Samples>({
            method: 'GET',
            url: `/api/archive/${encodedInstance}/parameters${encodedName}/samples`,
            params: options,
        });
        return response.data.sample || [];
    }

    async listParameters(options: ListParametersOptions = {}) {
        const encodedInstance = encodeURIComponent(this.instance);
        const response = await this.doRequest<ListParametersPage>({
            method: 'GET',
            url: `/api/mdb/${encodedInstance}/parameters`,
            params: options,
        });
        return response.data;
    }

    async listEvents(options: ListEventsOptions = {}) {
        const encodedInstance = encodeURIComponent(this.instance);
        const response = await this.doRequest<ListEventsPage>({
            method: 'GET',
            url: `/api/archive/${encodedInstance}/events`,
            params: options,
        });
        return response.data;
    }

    private doRequest<T>(request: BackendSrvRequest) {
        request.url = this.settings.url + request.url;
        if (this.settings.basicAuth || this.settings.withCredentials) {
            request.withCredentials = true;
            request.credentials = 'include';
        }
        if (this.settings.basicAuth) {
            request.headers!.Authorization = this.settings.basicAuth;
        }
        return getBackendSrv().fetch<T>(request).toPromise();
    }
}
