import { UAParser } from 'ua-parser-js';
export const parseUserAgent = (userAgent) => {
    if (!userAgent)
        return {};
    const parser = new UAParser(userAgent);
    const browser = parser.getBrowser();
    const operatingSystem = parser.getOS();
    const device = parser.getDevice();
    return {
        browser: [browser.name, browser.version].filter(Boolean).join(' ') || undefined,
        operatingSystem: [operatingSystem.name, operatingSystem.version].filter(Boolean).join(' ') || undefined,
        device: [device.vendor, device.model, device.type].filter(Boolean).join(' ') || undefined
    };
};
//# sourceMappingURL=user-agent.js.map