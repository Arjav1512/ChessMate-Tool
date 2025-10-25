import { AlertTriangle, X } from 'lucide-react';
import { checkCompatibility } from '../utils/compatibility';

interface CompatibilityWarningProps {
  onDismiss?: () => void;
}

export function CompatibilityWarning({ onDismiss }: CompatibilityWarningProps) {
  const compatibility = checkCompatibility();
  
  if (compatibility.supported) {
    return null;
  }
  
  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
      <div className="flex items-start">
        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 mr-3 flex-shrink-0" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
            Browser Compatibility Warning
          </h3>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-2">
            Your browser may not fully support all features of ChessMate. Some functionality may be limited.
          </p>
          <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
            {compatibility.missingFeatures.map((feature, index) => (
              <li key={index}>{feature}</li>
            ))}
          </ul>
          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-2">
            For the best experience, please use a modern browser like Chrome, Firefox, Safari, or Edge.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-3 text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
