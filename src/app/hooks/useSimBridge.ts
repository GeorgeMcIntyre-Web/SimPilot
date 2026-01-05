import { useState, useEffect } from 'react';
import { useGlobalBusy } from '../../ui/GlobalBusyContext';
import { simBridgeClient, SimBridgeStatus } from '../../integrations/simbridge/SimBridgeClient';

export function useSimBridge(isActive: boolean) {
  const [sbStatus, setSbStatus] = useState<SimBridgeStatus>({ isConnected: false, version: '' });
  const [sbStudyPath, setSbStudyPath] = useState('');
  const [sbError, setSbError] = useState<string | null>(null);
  const { pushBusy, popBusy } = useGlobalBusy();

  useEffect(() => {
    if (isActive) {
      checkStatus();
    }
  }, [isActive]);

  const checkStatus = async () => {
    const status = await simBridgeClient.getStatus();
    setSbStatus(status);
  };

  const handleConnect = async () => {
    pushBusy('Connecting to SimBridge...');
    try {
      const connected = await simBridgeClient.connect();
      if (connected) {
        await checkStatus();
        setSbError(null);
      } else {
        setSbError('Failed to connect to SimBridge. Ensure the server is running.');
      }
    } catch (_e) {
      setSbError('Connection error.');
    } finally {
      popBusy();
    }
  };

  const handleLoadStudy = async () => {
    if (!sbStudyPath) return;
    pushBusy('Loading study via SimBridge...');
    try {
      const success = await simBridgeClient.loadStudy(sbStudyPath);
      if (success) {
        setSbError(null);
        alert('Study loaded successfully!');
      } else {
        setSbError('Failed to load study.');
      }
    } catch (_e) {
      setSbError('Error loading study.');
    } finally {
      popBusy();
    }
  };

  return {
    sbStatus,
    sbStudyPath,
    sbError,
    setSbStudyPath,
    handleConnect,
    handleLoadStudy
  };
}
