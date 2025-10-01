/**
 * PaymentSuccess Component
 * 
 * Handles the payment success flow after Stripe checkout completion.
 * Features:
 * - Processes both real Stripe payments and mock payments for testing
 * - Confirms payment status with backend
 * - Updates invoice status to 'paid'
 * - Triggers dashboard refresh to reflect payment
 * - Provides user feedback and navigation options
 * 
 * URL Parameters:
 * - session_id: Stripe checkout session ID (or mock session ID)
 * - invoice_id: ID of the invoice that was paid
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { CheckCircle, ArrowLeft, Download, Mail } from 'lucide-react';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  
  // Component state
  const [loading, setLoading] = useState(true); // Loading state while processing payment
  const [paymentData, setPaymentData] = useState(null); // Payment confirmation data
  const [error, setError] = useState(''); // Error messages

  // Extract URL parameters
  const sessionId = searchParams.get('session_id'); // Stripe session ID
  const invoiceId = searchParams.get('invoice_id'); // Invoice ID

  /**
   * Process payment confirmation when component mounts
   * Handles both mock payments (for testing) and real Stripe payments
   */
  useEffect(() => {
    const processPayment = async () => {
      if (sessionId && invoiceId) {
        try {
          // Check if this is a mock session (used for testing without real payments)
          if (sessionId.startsWith('mock_session_')) {
            // Handle mock payment success - simulate successful payment
            setPaymentData({
              mock: true,
              message: 'Mock payment completed successfully! This is a test transaction.',
              invoice: {
                id: invoiceId,
                status: 'paid',
                paymentDate: new Date().toISOString()
              }
            });
            
            // 🔄 Trigger dashboard refresh for mock payment
            window.dispatchEvent(new CustomEvent('invoicePaid', { detail: { invoiceId } }));
            console.log('Mock payment completed - triggering dashboard refresh');
            
            setLoading(false);
            return;
          }

          // Handle real Stripe payment
          const token = localStorage.getItem('authToken');
          const response = await fetch('/api/payments/payment-success', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              sessionId,
              invoiceId
            })
          });

          if (response.ok) {
            const result = await response.json();
            setPaymentData(result);
            
            // 🔄 Trigger dashboard refresh for real payment
            window.dispatchEvent(new CustomEvent('invoicePaid', { detail: { invoiceId } }));
            console.log('Real payment completed - triggering dashboard refresh');
          } else {
            throw new Error('Failed to process payment confirmation');
          }
        } catch (error) {
          console.error('Payment confirmation error:', error);
          setError('Failed to confirm payment. Please contact support.');
        } finally {
          setLoading(false);
        }
      } else {
        setError('Missing payment information');
        setLoading(false);
      }
    };

    processPayment();
  }, [sessionId, invoiceId]);


  const handleDownloadReceipt = () => {
    // Generate and download payment receipt
    window.print();
  };

  const handleEmailReceipt = async () => {
    try {
      const token = localStorage.getItem('authToken');
      await fetch('/api/payments/email-receipt', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          invoiceId,
          sessionId
        })
      });
      
      alert('Receipt sent to your email address!');
    } catch (error) {
      console.error('Email receipt error:', error);
      alert('Failed to send receipt. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Confirming payment...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Payment Error
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            {error}
          </p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

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
            Payment Successful
          </h1>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Success Message */}
          <div className={`rounded-lg shadow-lg p-8 mb-6 text-center ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Payment Successful!
            </h2>
            <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
              {paymentData?.mock 
                ? 'Mock payment completed successfully! This is a test transaction.' 
                : 'Your payment has been processed successfully.'
              }
            </p>

            {paymentData?.mock && (
              <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded">
                🧪 This is a test payment. Configure real Stripe keys for production use.
              </div>
            )}

            {paymentData && (
              <div className="space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Invoice ID:</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{invoiceId}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Transaction ID:</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{sessionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Payment Date:</span>
                  <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>
                    {new Date().toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleDownloadReceipt}
                className="flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Receipt
              </button>
              <button
                onClick={handleEmailReceipt}
                className="flex items-center justify-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email Receipt
              </button>
            </div>
          </div>

          {/* Next Steps */}
          <div className={`rounded-lg shadow-lg p-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              What's Next?
            </h3>
            <ul className={`space-y-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              <li>• Your invoice has been marked as paid</li>
              <li>• A confirmation email will be sent to your registered email address</li>
              <li>• You can view your payment history in the invoices section</li>
              <li>• For any questions, please contact our support team</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
