import type { IDeviceProvider } from './IDeviceProvider.js';

export class DeviceRegistry {
  private providers = new Map<string, IDeviceProvider>();

  register(provider: IDeviceProvider): void {
    this.providers.set(provider.providerName, provider);
  }

  get(name: string): IDeviceProvider {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new Error(`Unknown device provider: ${name}`);
    }
    return provider;
  }

  getAllProviders(): IDeviceProvider[] {
    return Array.from(this.providers.values());
  }
}

export const deviceRegistry = new DeviceRegistry();
