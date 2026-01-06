import { envConfig } from '../../config/env';

export interface SimBridgeStatus {
    isConnected: boolean;
    version: string;
    activeStudy?: string;
}

export interface SimBridgeClient {
    connect(): Promise<boolean>;
    disconnect(): Promise<void>;
    getStatus(): Promise<SimBridgeStatus>;
    loadStudy(path: string): Promise<boolean>;
    getSignal(name: string): Promise<any>;
    setSignal(name: string, value: any): Promise<boolean>;
}

class SimBridgeClientImpl implements SimBridgeClient {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    private getUrl(path: string): string {
        // Ensure no double slashes
        const base = this.baseUrl.replace(/\/$/, '');
        const endpoint = path.replace(/^\//, '');
        return `${base}/${endpoint}`;
    }

    async connect(): Promise<boolean> {
        try {
            const response = await fetch(this.getUrl('/health'));
            return response.ok;
        } catch (e) {
            console.error('SimBridge connection failed', e);
            return false;
        }
    }

    async disconnect(): Promise<void> {
        // No-op for REST
    }

    async getStatus(): Promise<SimBridgeStatus> {
        try {
            const response = await fetch(this.getUrl('/status'));
            if (!response.ok) throw new Error('Failed to get status');
            return await response.json();
        } catch (_e) {
            return { isConnected: false, version: 'unknown' };
        }
    }

    async loadStudy(path: string): Promise<boolean> {
        try {
            const response = await fetch(this.getUrl('/study/load'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            return response.ok;
        } catch (e) {
            console.error('Failed to load study', e);
            return false;
        }
    }

    async getSignal(name: string): Promise<any> {
        try {
            const response = await fetch(this.getUrl(`/signal/${name}`));
            if (!response.ok) return null;
            const data = await response.json();
            return data.value;
        } catch (e) {
            console.error('Failed to get signal', e);
            return null;
        }
    }

    async setSignal(name: string, value: any): Promise<boolean> {
        try {
            const response = await fetch(this.getUrl('/signal'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, value })
            });
            return response.ok;
        } catch (e) {
            console.error('Failed to set signal', e);
            return false;
        }
    }
}

// Default to localhost:5000 if not configured
const url = envConfig.simBridgeUrl || 'http://localhost:5000';
export const simBridgeClient = new SimBridgeClientImpl(url);
