import { useState } from 'react';
import {
  AlertTriangle,
  RefreshCw,
  FileQuestion,
  FileX2,
  Wifi,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  ExternalLink
} from 'lucide-react';
import { cn } from '../../../ui/lib/utils';

export interface ErrorInfo {
  type: 'file' | 'parse' | 'network' | 'validation' | 'unknown';
  message: string;
  details?: string;
  fileName?: string;
}

interface ErrorDisplayProps {
  error: string | ErrorInfo;
  onRetry?: () => void;
  className?: string;
}

interface ErrorSuggestion {
  text: string;
  link?: string;
}

function parseErrorType(error: string | ErrorInfo): ErrorInfo {
  if (typeof error === 'object') return error;

  const errorLower = error.toLowerCase();

  // File-related errors
  if (errorLower.includes('file') || errorLower.includes('select') || errorLower.includes('upload')) {
    return {
      type: 'file',
      message: error,
    };
  }

  // Parse/format errors
  if (errorLower.includes('parse') || errorLower.includes('format') || errorLower.includes('invalid') ||
      errorLower.includes('column') || errorLower.includes('sheet') || errorLower.includes('excel')) {
    return {
      type: 'parse',
      message: error,
    };
  }

  // Network errors
  if (errorLower.includes('network') || errorLower.includes('fetch') || errorLower.includes('timeout') ||
      errorLower.includes('connection') || errorLower.includes('offline')) {
    return {
      type: 'network',
      message: error,
    };
  }

  // Validation errors
  if (errorLower.includes('required') || errorLower.includes('missing') || errorLower.includes('validation')) {
    return {
      type: 'validation',
      message: error,
    };
  }

  return {
    type: 'unknown',
    message: error,
  };
}

function getErrorIcon(type: ErrorInfo['type']) {
  switch (type) {
    case 'file':
      return <FileQuestion className="w-5 h-5" />;
    case 'parse':
      return <FileX2 className="w-5 h-5" />;
    case 'network':
      return <Wifi className="w-5 h-5" />;
    case 'validation':
      return <AlertTriangle className="w-5 h-5" />;
    default:
      return <HelpCircle className="w-5 h-5" />;
  }
}

function getSuggestions(errorInfo: ErrorInfo): ErrorSuggestion[] {
  const suggestions: ErrorSuggestion[] = [];

  switch (errorInfo.type) {
    case 'file':
      suggestions.push(
        { text: 'Make sure you have selected at least one file' },
        { text: 'Check that your files are in .xlsx or .xlsm format' },
        { text: 'For first-time imports, a Simulation Status file is required' }
      );
      break;
    case 'parse':
      suggestions.push(
        { text: 'Verify the file is a valid Excel workbook' },
        { text: 'Ensure the file contains the expected sheet names and columns' },
        { text: 'Check that the file is not corrupted or password-protected' },
        { text: 'Try opening the file in Excel to verify it loads correctly' }
      );
      break;
    case 'network':
      suggestions.push(
        { text: 'Check your internet connection' },
        { text: 'Try refreshing the page and attempting again' },
        { text: 'If the problem persists, try again later' }
      );
      break;
    case 'validation':
      suggestions.push(
        { text: 'Review the error message for specific missing data' },
        { text: 'Ensure all required columns are present in your file' },
        { text: 'Check that data values are in the expected format' }
      );
      break;
    default:
      suggestions.push(
        { text: 'Try refreshing the page and attempting again' },
        { text: 'If the problem persists, check the browser console for more details' }
      );
  }

  return suggestions;
}

export function ErrorDisplay({ error, onRetry, className }: ErrorDisplayProps) {
  const [showDetails, setShowDetails] = useState(false);
  const errorInfo = parseErrorType(error);
  const suggestions = getSuggestions(errorInfo);

  return (
    <div className={cn(
      "rounded-lg border overflow-hidden",
      "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",
      className
    )}>
      {/* Error Header */}
      <div className="flex items-start gap-3 p-4">
        <div className="flex-shrink-0 p-2 rounded-lg bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400">
          {getErrorIcon(errorInfo.type)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
            {errorInfo.type === 'file' && 'File Selection Error'}
            {errorInfo.type === 'parse' && 'File Processing Error'}
            {errorInfo.type === 'network' && 'Connection Error'}
            {errorInfo.type === 'validation' && 'Validation Error'}
            {errorInfo.type === 'unknown' && 'Error'}
          </h4>
          <p className="mt-1 text-sm text-red-700 dark:text-red-300">
            {errorInfo.message}
          </p>
          {errorInfo.fileName && (
            <p className="mt-1 text-xs text-red-600 dark:text-red-400">
              File: {errorInfo.fileName}
            </p>
          )}
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        )}
      </div>

      {/* Suggestions Section */}
      {suggestions.length > 0 && (
        <div className="border-t border-red-200 dark:border-red-800">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-between p-3 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
              <Lightbulb className="w-4 h-4" />
              <span>Troubleshooting suggestions</span>
            </div>
            {showDetails ? (
              <ChevronDown className="w-4 h-4 text-red-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-red-500" />
            )}
          </button>

          {showDetails && (
            <div className="px-4 pb-4">
              <ul className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300"
                  >
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-200 dark:bg-red-800 text-red-700 dark:text-red-300 flex items-center justify-center text-xs font-medium">
                      {idx + 1}
                    </span>
                    <span className="flex-1">
                      {suggestion.text}
                      {suggestion.link && (
                        <a
                          href={suggestion.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-1 inline-flex items-center gap-0.5 text-red-600 dark:text-red-400 hover:underline"
                        >
                          Learn more
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Error Details (for developers) */}
      {errorInfo.details && (
        <div className="border-t border-red-200 dark:border-red-800 p-3 bg-red-100/50 dark:bg-red-900/30">
          <p className="text-xs text-red-600 dark:text-red-400 font-mono break-all">
            {errorInfo.details}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * A compact inline error message for smaller contexts
 */
export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
      <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
      <span className="text-sm text-red-700 dark:text-red-300 flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex-shrink-0 p-1 rounded hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
          title="Retry"
        >
          <RefreshCw className="w-4 h-4 text-red-600 dark:text-red-400" />
        </button>
      )}
    </div>
  );
}
