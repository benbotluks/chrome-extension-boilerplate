import React, { useState, useEffect } from 'react';
import { StorageService } from '../services/StorageService';
import type { BotpressConfig } from '../types';


let storageService: StorageService;

interface ConfigurationPanelProps {
  onConfigurationComplete: (config: BotpressConfig) => void;
  onCancel?: () => void;
  initialConfig?: BotpressConfig;
}

const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({
  onConfigurationComplete,
  onCancel,
  initialConfig,
}) => {
  const [webhookId, setWebhookId] = useState(initialConfig?.webhookId || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  useEffect(() => {
    // Load existing configuration on mount
    const loadConfig = async () => {
      try {
        storageService = StorageService.getInstance();
        const config = await storageService.loadBotpressConfig();
        if (config && config.webhookId) {
          setWebhookId(config.webhookId);
        }
      } catch (error) {
        console.error('Failed to load configuration:', error);
      }
    };

    if (!initialConfig) {
      loadConfig();
    }
  }, [initialConfig]);

  const validateWebhookId = (id: string): boolean => {
    // Basic validation for webhook ID format
    return id.length > 10 && id.includes('-');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!webhookId.trim()) {
      setError('Webhook ID is required');
      return;
    }

    if (!validateWebhookId(webhookId.trim())) {
      setError('Please enter a valid webhook ID');
      return;
    }

    setIsLoading(true);
    setIsTestingConnection(true);

    try {
      const config: BotpressConfig = {
        webhookId: webhookId.trim(),
        isConfigured: true,
      };

      // Test the configuration by attempting to configure the service
      await onConfigurationComplete(config);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Configuration failed');
    } finally {
      setIsLoading(false);
      setIsTestingConnection(false);
    }
  };

  const handleWebhookIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWebhookId(e.target.value);
    if (error) setError(null);
  };

  const isFormValid = webhookId.trim().length > 0 && validateWebhookId(webhookId.trim());

  return (
    <div className="configuration-panel">
      <div className="config-header">
        <div className="config-icon">⚙️</div>
        <h2>Configure Botpress</h2>
        <p>Enter your Botpress webhook ID to start chatting with your bot.</p>
      </div>

      <form onSubmit={handleSubmit} className="config-form">
        <div className="form-group">
          <label htmlFor="webhookId" className="form-label">
            Webhook ID
          </label>
          <input
            id="webhookId"
            type="text"
            value={webhookId}
            onChange={handleWebhookIdChange}
            placeholder="Enter your Botpress webhook ID"
            className={`form-input ${error ? 'form-input-error' : ''}`}
            disabled={isLoading}
            autoFocus
          />
          <div className="form-help">
            You can find your webhook ID in your Botpress bot's integration settings.
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <div className="form-actions">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
              disabled={isLoading}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="submit-button"
            disabled={!isFormValid || isLoading}
          >
            {isTestingConnection ? (
              <>
                <div className="loading-spinner" />
                Testing Connection...
              </>
            ) : isLoading ? (
              <>
                <div className="loading-spinner" />
                Saving...
              </>
            ) : (
              'Save & Test Connection'
            )}
          </button>
        </div>
      </form>

      <div className="config-help">
        <h3>How to get your Webhook ID:</h3>
        <ol>
          <li>Go to your Botpress Cloud dashboard</li>
          <li>Select your bot</li>
          <li>Navigate to "Integrations" → "Webhook"</li>
          <li>Copy the webhook ID from the URL or settings</li>
        </ol>
      </div>

      <style>{`
        .configuration-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 24px;
          background: white;
          overflow-y: auto;
        }

        .config-header {
          text-align: center;
          margin-bottom: 32px;
        }

        .config-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }

        .config-header h2 {
          margin: 0 0 8px 0;
          font-size: 24px;
          font-weight: 600;
          color: #212529;
        }

        .config-header p {
          margin: 0;
          font-size: 14px;
          color: #6c757d;
          line-height: 1.4;
        }

        .config-form {
          margin-bottom: 32px;
        }

        .form-group {
          margin-bottom: 24px;
        }

        .form-label {
          display: block;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
          color: #495057;
        }

        .form-input {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid #dee2e6;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
        }

        .form-input-error {
          border-color: #dc3545;
        }

        .form-input-error:focus {
          border-color: #dc3545;
          box-shadow: 0 0 0 3px rgba(220, 53, 69, 0.1);
        }

        .form-input:disabled {
          background: #f8f9fa;
          opacity: 0.7;
          cursor: not-allowed;
        }

        .form-help {
          margin-top: 6px;
          font-size: 12px;
          color: #6c757d;
          line-height: 1.3;
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
          border-radius: 6px;
          font-size: 14px;
          margin-bottom: 24px;
        }

        .error-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
        }

        .cancel-button,
        .submit-button {
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .cancel-button {
          background: #6c757d;
          color: white;
        }

        .cancel-button:hover:not(:disabled) {
          background: #5a6268;
        }

        .submit-button {
          background: #007bff;
          color: white;
        }

        .submit-button:hover:not(:disabled) {
          background: #0056b3;
        }

        .submit-button:disabled,
        .cancel-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .config-help {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          border-radius: 8px;
          padding: 20px;
          margin-top: auto;
        }

        .config-help h3 {
          margin: 0 0 12px 0;
          font-size: 16px;
          font-weight: 600;
          color: #495057;
        }

        .config-help ol {
          margin: 0;
          padding-left: 20px;
          color: #6c757d;
        }

        .config-help li {
          margin-bottom: 4px;
          font-size: 14px;
          line-height: 1.4;
        }

        /* Mobile responsiveness */
        @media (max-width: 480px) {
          .configuration-panel {
            padding: 16px;
          }

          .config-header {
            margin-bottom: 24px;
          }

          .config-header h2 {
            font-size: 20px;
          }

          .form-actions {
            flex-direction: column;
          }

          .cancel-button,
          .submit-button {
            width: 100%;
            justify-content: center;
          }

          .config-help {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default ConfigurationPanel;