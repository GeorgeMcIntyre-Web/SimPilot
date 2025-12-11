import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

export function useDrawerNavigation(onClose: () => void) {
  const navigate = useNavigate();

  const handleViewAssets = useCallback(
    (station: string, line: string) => {
      const params = new URLSearchParams();
      params.set('station', station);
      params.set('line', line);
      navigate(`/assets?${params.toString()}`);
      onClose();
    },
    [navigate, onClose]
  );

  const handleOpenToolingPage = useCallback(
    (toolingNumber: string) => {
      const params = new URLSearchParams();
      params.set('tooling', toolingNumber);
      navigate(`/tooling?${params.toString()}`);
      onClose();
    },
    [navigate, onClose]
  );

  const handleOpenAssetsForTooling = useCallback(
    (station: string, line: string, toolingNumber: string) => {
      const params = new URLSearchParams();
      params.set('station', station);
      params.set('line', line);
      params.set('tooling', toolingNumber);
      navigate(`/assets?${params.toString()}`);
      onClose();
    },
    [navigate, onClose]
  );

  return {
    handleViewAssets,
    handleOpenToolingPage,
    handleOpenAssetsForTooling,
  };
}
