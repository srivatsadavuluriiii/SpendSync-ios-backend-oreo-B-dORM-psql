export interface Config {
    port: number;
    env: string;
    mongodb: {
        uri: string;
    };
    redis: {
        host: string;
        port: number;
    };
}
export declare const config: Config;
