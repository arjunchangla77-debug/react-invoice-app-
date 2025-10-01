import React from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { XCircle, ArrowLeft, RefreshCw } from 'lucide-react';

const PaymentCancel = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  const invoiceId = searchParams.get('invoice_id');

  const handleRetryPayment = () => {
    if (invoiceId) {
      navigate(`/payment/${invoiceId}`);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className={`p-2 rounded-full transition-colors duration-200 ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-2xl font-bold ml-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Payment Cancelled
          </h1>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Cancel Message */}
          <div className={`rounded-lg shadow-lg p-8 mb-6 text-center ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Payment Cancelled
            </h2>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
              Your payment was cancelled. No charges have been made to your account.
            </p>

            {invoiceId && (
              <div className="mb-6">
                <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Invoice ID: <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{invoiceId}</span>
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleRetryPayment}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Payment Again
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-6 py-3 rounded-lg transition-colors ${
                  isDarkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Return to Dashboard
              </button>
            </div>
          </div>

          {/* Help Information */}
          <div className={`rounded-lg shadow-lg p-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Need Help?
            </h3>
            <ul className={`space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• You can retry the payment at any time</li>
              <li>• Your invoice remains unpaid and accessible</li>
              <li>• Contact support if you're experiencing payment issues</li>
              <li>• Multiple payment methods are available</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentCancel;
