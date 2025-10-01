import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { ArrowLeft, CreditCard, Lock, CheckCircle, XCircle, Loader } from 'lucide-react';

const StripePayment = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [searchParams] = useSearchParams();
  
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  
  // Get amount and other details from URL params
  const amount = searchParams.get('amount');
  const officeId = searchParams.get('officeId');
  const officeName = searchParams.get('officeName');

  useEffect(() => {
    loadInvoiceData();
  }, [invoiceId]);

  const loadInvoiceData = async () => {
    try {
      setLoading(true);
      
      // If we have URL params, use them directly
      if (amount && officeId && officeName) {
        setInvoice({
          id: invoiceId,
          amount: parseFloat(amount),
          office_name: decodeURIComponent(officeName),
          office_id: officeId,
          status: 'pending'
        });
      } else {
        // Otherwise, fetch from API
        const token = localStorage.getItem('authToken');
        const response = await fetch(`/api/invoices/${invoiceId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const result = await response.json();
          if (result.success) {
            setInvoice(result.data);
          }
        }
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!invoice) return;

    setProcessing(true);
    setError('');

    try {
      // Create payment intent
      const token = localStorage.getItem('authToken');
      console.log('Creating payment intent for amount:', invoice.amount);
      
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: Math.round(invoice.amount * 100), // Convert to cents
          currency: 'usd',
          invoiceId: invoice.id,
          officeId: invoice.office_id,
          description: `Invoice payment for ${invoice.office_name}`
        })
      });

      console.log('Payment API response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('Payment intent created successfully:', result);
        const { clientSecret, paymentIntentId, mock } = result;
        
        if (mock) {
          // Mock payment - simulate success
          setPaymentStatus('success');
          setMessage('Mock payment successful! Configure real Stripe keys for production.');
          
          // Simulate redirect to success page after 2 seconds
          setTimeout(() => {
            navigate(`/payment/success?session_id=mock_session_${Date.now()}&invoice_id=${invoiceId}`);
          }, 2000);
        } else {
          // Real Stripe payment - redirect to Stripe Checkout or handle payment intent
          setPaymentStatus('success');
        }
      } else {
        const errorData = await response.json();
        console.error('Payment API error:', errorData);
        throw new Error(errorData.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      setError(error.message || 'Payment failed');
      setPaymentStatus('error');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async (cardDetails) => {
    setProcessing(true);
    setError('');

    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update invoice status
      const token = localStorage.getItem('authToken');
      await fetch(`/api/invoices/${invoice.id}/payment`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: 'paid',
          payment_method: 'card',
          payment_date: new Date().toISOString(),
          transaction_id: `txn_${Date.now()}`
        })
      });

      setPaymentStatus('success');
      
      // Redirect after success
      setTimeout(() => {
        navigate(`/office/${invoice.office_id}?tab=invoices`);
      }, 3000);

    } catch (error) {
      console.error('Payment error:', error);
      setError('Payment failed. Please try again.');
      setPaymentStatus('failed');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className={`ml-3 text-lg ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
          Loading payment details...
        </span>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Invoice Not Found
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            The invoice you're trying to pay could not be found.
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

  if (paymentStatus === 'success') {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        isDarkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className={`text-xl font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Payment Successful!
          </h2>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>
            Your payment of ${invoice.amount.toFixed(2)} has been processed successfully.
          </p>
          <p className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-500'}`}>
            Redirecting you back to the invoice...
          </p>
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
            onClick={() => navigate(-1)}
            className={`p-2 rounded-full transition-colors duration-200 ${
              isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-100 text-gray-700'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className={`text-2xl font-bold ml-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
            Secure Payment
          </h1>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Invoice Summary */}
          <div className={`rounded-lg shadow-lg p-6 mb-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <h2 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
              Invoice Summary
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Office:</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{invoice.office_name}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Invoice ID:</span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>{invoice.id}</span>
              </div>
              <div className="border-t pt-2 mt-4">
                <div className="flex justify-between text-lg font-semibold">
                  <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>Total Amount:</span>
                  <span className="text-blue-600">${invoice.amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Form */}
          <div className={`rounded-lg shadow-lg p-6 ${
            isDarkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className="flex items-center mb-4">
              <Lock className="w-5 h-5 text-green-500 mr-2" />
              <h2 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>
                Secure Payment
              </h2>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {error}
              </div>
            )}

            {message && (
              <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
                {message}
              </div>
            )}

            {/* Payment Method Selection */}
            <div className="mb-6">
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Payment Method
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="card"
                    checked={paymentMethod === 'card'}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="mr-2"
                  />
                  <CreditCard className="w-4 h-4 mr-2" />
                  <span className={isDarkMode ? 'text-white' : 'text-gray-800'}>Credit/Debit Card</span>
                </label>
              </div>
            </div>

            {/* Payment Button */}
            <button
              onClick={handlePayment}
              disabled={processing}
              className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                processing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {processing ? (
                <div className="flex items-center justify-center">
                  <Loader className="w-5 h-5 animate-spin mr-2" />
                  Processing Payment...
                </div>
              ) : (
                `Pay $${invoice.amount.toFixed(2)}`
              )}
            </button>

            {/* Security Notice */}
            <div className="mt-4 text-center">
              <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                🔒 Your payment is secured by Stripe. We never store your card details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StripePayment;
