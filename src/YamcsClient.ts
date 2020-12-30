import { DataSourceInstanceSettings } from '@grafana/data';
import { BackendSrvRequest, getBackendSrv } from '@grafana/runtime';
import { Instance, ListParametersOptions, ListParametersPage, Sample, SampleOptions, Samples, YamcsOptions } from './types';

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
