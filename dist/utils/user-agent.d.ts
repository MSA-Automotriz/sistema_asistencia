export type DeviceMetadata = {
    browser?: string;
    operatingSystem?: string;
    device?: string;
};
export declare const parseUserAgent: (userAgent?: string) => DeviceMetadata;
