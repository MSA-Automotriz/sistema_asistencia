import { UAParser } from 'ua-parser-js';

export type DeviceMetadata = {
  browser?: string;
  operatingSystem?: string;
  device?: string;
};

export const parseUserAgent = (userAgent?: string): DeviceMetadata => {
  if (!userAgent) return {};
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