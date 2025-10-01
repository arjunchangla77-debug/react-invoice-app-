import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { CreditCard, CheckCircle, XCircle, Loader, Shield, Download, Mail } from 'lucide-react';

const PublicPayment = () => {
  const { invoiceId } = useParams();
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [paymentIntent, setPaymentIntent] = useState(null);

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      
      // Create payment intent for this invoice
      const response = await fetch(`/api/payments/create-payment-intent/public/${invoiceId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency: 'usd'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setInvoice(result.invoice);
        setPaymentIntent(result);
      } else {
        setError(result.message || 'Failed to load invoice');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      setError('Failed to load invoice data');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    setProcessing(true);
    setError('');

    try {
      // Simulate payment processing (replace with actual Stripe integration)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (paymentIntent?.mock) {
        // Mock payment success
        setSuccess(true);
        console.log('Mock payment completed successfully');
      } else {
        // Here you would integrate with Stripe Elements
        // For now, just show success
        setSuccess(true);
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
            Loading invoice...
          </p>
        </div>
      </div>
    );
  }

  if (error && !invoice) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold mb-2 ${
            isDarkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Invoice Not Found
          </h2>
          <p className={`mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {error}
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  if (success) {
    const currentDate = new Date().toLocaleDateString('en-GB');
    const mockTransactionId = `mock_session_${Date.now()}`;
    
    return (
      <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className={`text-3xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Payment Successful!
              </h1>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Mock payment completed successfully! This is a test transaction.
              </p>
            </div>

            {/* Test Payment Notice */}
            <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
              <p className="text-blue-700 dark:text-blue-300 text-sm flex items-center">
                <span className="mr-2">🧪</span>
                This is a test payment. Configure real Stripe keys for production use.
              </p>
            </div>

            {/* Payment Details */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6`}>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Invoice ID:
                  </span>
                  <span className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {invoice?.number}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Transaction ID:
                  </span>
                  <span className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {mockTransactionId}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                    Payment Date:
                  </span>
                  <span className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}>
                    {currentDate}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-4 mt-6">
                <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center">
                  <Download className="w-4 h-4 mr-2" />
                  Download Receipt
                </button>
                <button className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center">
                  <Mail className="w-4 h-4 mr-2" />
                  Email Receipt
                </button>
              </div>
            </div>

            {/* What's Next Section */}
            <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                What's Next?
              </h3>
              
              <ul className="space-y-3">
                <li className={`flex items-start ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  Your invoice has been marked as paid
                </li>
                <li className={`flex items-start ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  A confirmation email will be sent to your registered email address
                </li>
                <li className={`flex items-start ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  You can view your payment history in the invoices section
                </li>
                <li className={`flex items-start ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  <span className="w-2 h-2 bg-green-500 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                  For any questions, please contact our support team
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Invoice Summary */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6`}>
            <h2 className={`text-xl font-semibold mb-6 ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Invoice Summary
            </h2>
            
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Office:
                </span>
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {invoice?.officeName}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Invoice ID:
                </span>
                <span className={`font-medium ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {invoice?.number}
                </span>
              </div>
              
              <div className="flex justify-between text-lg font-semibold pt-4 border-t">
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  Total Amount:
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  ${invoice?.amount}
                </span>
              </div>
            </div>
          </div>

          {/* Secure Payment */}
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6`}>
            <div className="flex items-center mb-6">
              <Shield className="w-5 h-5 text-green-600 mr-2" />
              <h2 className={`text-xl font-semibold ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Secure Payment
              </h2>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}

            {/* Payment Method */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-3 ${
                isDarkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Payment Method
              </label>
              
              <div className="flex items-center space-x-3 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <input
                  type="radio"
                  id="credit-card"
                  name="payment-method"
                  defaultChecked
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                <label 
                  htmlFor="credit-card" 
                  className={`font-medium ${
                    isDarkMode ? 'text-white' : 'text-gray-900'
                  }`}
                >
                  Credit/Debit Card
                </label>
              </div>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className={`w-full py-4 px-6 rounded-lg font-semibold text-lg transition-colors ${
                processing
                  ? 'bg-gray-400 cursor-not-allowed text-gray-600'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {processing ? (
                <div className="flex items-center justify-center">
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Processing Payment...
                </div>
              ) : (
                `Pay $${invoice?.amount}`
              )}
            </button>

            {/* Security Notice */}
            <div className="flex items-center justify-center mt-4 text-sm">
              <span className="mr-1">🔒</span>
              <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
                Your payment is secured by Stripe. We never store your card details.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicPayment;
