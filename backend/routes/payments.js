const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { authenticateToken } = require('../middleware/auth');

// Initialize Stripe with error handling
let stripe;
try {
  const hasValidStripeKey = process.env.STRIPE_SECRET_KEY && 
                           process.env.STRIPE_SECRET_KEY.length > 0 && 
                           !process.env.STRIPE_SECRET_KEY.includes('your-stripe-secret-key') &&
                           !process.env.STRIPE_SECRET_KEY.includes('_here') &&
                           !process.env.STRIPE_SECRET_KEY.includes('test_secret_key_here') &&
                           process.env.STRIPE_SECRET_KEY.startsWith('sk_');
  
  if (!hasValidStripeKey) {
    console.log('Using mock payment system - Stripe key not configured or invalid');
    console.log('To use real Stripe payments, set a valid STRIPE_SECRET_KEY in your .env file');
  } else {
    stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
    console.log('Stripe initialized successfully');
  }
} catch (error) {
  console.error('Error initializing Stripe:', error.message);
  console.log('Falling back to mock payment system');
}

const router = express.Router();
const dbPath = path.join(__dirname, '..', 'database', 'users.db');

// Get database connection
const getDb = () => {
  return new sqlite3.Database(dbPath);
};

// Public payment route for invoice payments (no authentication required)
router.post('/create-payment-intent/public/:invoiceId', async (req, res) => {
  try {
    const { invoiceId } = req.params;
    const { amount, currency = 'usd', description } = req.body;

    // Verify invoice exists and get office info
    const db = getDb();
    const invoiceQuery = `
      SELECT i.*, o.name as office_name, o.id as office_id
      FROM invoices i
      JOIN dental_offices o ON i.dental_office_id = o.id
      WHERE i.id = ? AND i.status != 'paid'
    `;

    const invoice = await new Promise((resolve, reject) => {
      db.get(invoiceQuery, [invoiceId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!invoice) {
      db.close();
      return res.status(404).json({
        success: false,
        message: 'Invoice not found or already paid'
      });
    }

    const hasValidStripeKey = process.env.STRIPE_SECRET_KEY && 
                             process.env.STRIPE_SECRET_KEY.length > 0 && 
                             !process.env.STRIPE_SECRET_KEY.includes('your-stripe-secret-key') &&
                             !process.env.STRIPE_SECRET_KEY.includes('_here') &&
                             !process.env.STRIPE_SECRET_KEY.includes('test_secret_key_here') &&
                             process.env.STRIPE_SECRET_KEY.startsWith('sk_');

    if (hasValidStripeKey && stripe) {
      // Use real Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount || invoice.total_amount * 100), // Amount in cents
        currency: currency,
        metadata: {
          invoiceId: invoiceId,
          officeId: invoice.dental_office_id,
          publicPayment: 'true'
        },
        description: description || `Payment for invoice ${invoice.invoice_number} - ${invoice.office_name}`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Store payment intent in database
      const query = `
        INSERT INTO payment_intents (
          stripe_payment_intent_id, invoice_id, office_id, user_id, 
          amount, currency, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      db.run(query, [
        paymentIntent.id,
        invoiceId,
        invoice.dental_office_id,
        null, // No user ID for public payments
        Math.round(amount || invoice.total_amount * 100),
        currency,
        'created'
      ], function(err) {
        if (err) {
          console.error('Error storing payment intent:', err);
        }
      });

      db.close();

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        invoice: {
          id: invoice.id,
          number: invoice.invoice_number,
          amount: invoice.total_amount,
          officeName: invoice.office_name
        }
      });

    } else {
      // Mock payment for testing (when Stripe keys are not configured)
      console.log('Using mock payment system - configure real Stripe keys for production');
      
      const mockPaymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockClientSecret = `${mockPaymentIntentId}_secret_mock`;

      // Store mock payment intent in database
      const query = `
        INSERT INTO payment_intents (
          stripe_payment_intent_id, invoice_id, office_id, user_id, 
          amount, currency, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      db.run(query, [
        mockPaymentIntentId,
        invoiceId,
        invoice.dental_office_id,
        null, // No user ID for public payments
        Math.round(amount || invoice.total_amount * 100),
        currency,
        'mock_created'
      ], function(err) {
        if (err) {
          console.error('Error storing mock payment intent:', err);
        }
      });

      db.close();

      res.json({
        success: true,
        clientSecret: mockClientSecret,
        paymentIntentId: mockPaymentIntentId,
        mock: true,
        message: 'Mock payment created - configure real Stripe keys for production',
        invoice: {
          id: invoice.id,
          number: invoice.invoice_number,
          amount: invoice.total_amount,
          officeName: invoice.office_name
        }
      });
    }

  } catch (error) {
    console.error('Error creating public payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
});

// Create payment intent (authenticated route)
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  try {
    const { amount, currency = 'usd', invoiceId, officeId, description } = req.body;

    if (!amount || !invoiceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount and invoice ID are required' 
      });
    }

    // Check if we have valid Stripe keys (not placeholder)
    const hasValidStripeKey = process.env.STRIPE_SECRET_KEY && 
                             process.env.STRIPE_SECRET_KEY.length > 0 && 
                             !process.env.STRIPE_SECRET_KEY.includes('your-stripe-secret-key') &&
                             !process.env.STRIPE_SECRET_KEY.includes('_here') &&
                             !process.env.STRIPE_SECRET_KEY.includes('test_secret_key_here') &&
                             process.env.STRIPE_SECRET_KEY.startsWith('sk_');

    if (hasValidStripeKey && stripe) {
      // Use real Stripe
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount), // Amount in cents
        currency: currency,
        metadata: {
          invoiceId: invoiceId,
          officeId: officeId || '',
          userId: req.user.id
        },
        description: description || `Payment for invoice ${invoiceId}`,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      // Store payment intent in database
      const db = getDb();
      const query = `
        INSERT INTO payment_intents (
          stripe_payment_intent_id, invoice_id, office_id, user_id, 
          amount, currency, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      db.run(query, [
        paymentIntent.id,
        invoiceId,
        officeId,
        req.user.id,
        amount,
        currency,
        'created'
      ], function(err) {
        if (err) {
          console.error('Error storing payment intent:', err);
        }
      });

      db.close();

      res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id
      });

    } else {
      // Mock payment for testing (when Stripe keys are not configured)
      console.log('Using mock payment system - configure real Stripe keys for production');
      
      const mockPaymentIntentId = `pi_mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const mockClientSecret = `${mockPaymentIntentId}_secret_mock`;

      // Store mock payment intent in database
      const db = getDb();
      const query = `
        INSERT INTO payment_intents (
          stripe_payment_intent_id, invoice_id, office_id, user_id, 
          amount, currency, status, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
      `;

      db.run(query, [
        mockPaymentIntentId,
        invoiceId,
        officeId,
        req.user.id,
        amount,
        currency,
        'mock_created'
      ], function(err) {
        if (err) {
          console.error('Error storing mock payment intent:', err);
        }
      });

      db.close();

      res.json({
        success: true,
        clientSecret: mockClientSecret,
        paymentIntentId: mockPaymentIntentId,
        mock: true,
        message: 'Mock payment created - configure real Stripe keys for production'
      });
    }

  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent',
      error: error.message
    });
  }
});

// Create Stripe Checkout Session
router.post('/create-checkout-session', authenticateToken, async (req, res) => {
  try {
    const { amount, invoiceId, officeId, officeName, successUrl, cancelUrl } = req.body;

    if (!amount || !invoiceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Amount and invoice ID are required' 
      });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Invoice Payment - ${officeName || 'Dental Office'}`,
              description: `Payment for invoice ${invoiceId}`,
            },
            unit_amount: Math.round(amount), // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: successUrl || `${req.headers.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&invoice_id=${invoiceId}`,
      cancel_url: cancelUrl || `${req.headers.origin}/payment/cancel?invoice_id=${invoiceId}`,
      metadata: {
        invoiceId: invoiceId,
        officeId: officeId || '',
        userId: req.user.id
      }
    });

    // Store checkout session in database
    const db = getDb();
    const query = `
      INSERT INTO checkout_sessions (
        stripe_session_id, invoice_id, office_id, user_id, 
        amount, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `;

    db.run(query, [
      session.id,
      invoiceId,
      officeId,
      req.user.id,
      amount,
      'created'
    ], function(err) {
      if (err) {
        console.error('Error storing checkout session:', err);
      }
    });

    db.close();

    res.json({
      success: true,
      sessionId: session.id,
      url: session.url
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create checkout session',
      error: error.message
    });
  }
});

// Handle successful payment
router.post('/payment-success', authenticateToken, async (req, res) => {
  try {
    const { sessionId, invoiceId } = req.body;

    if (!sessionId || !invoiceId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session ID and invoice ID are required' 
      });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status === 'paid') {
      const db = getDb();

      // Update invoice status to paid
      const updateInvoiceQuery = `
        UPDATE invoices 
        SET status = 'paid', 
            payment_date = datetime('now'),
            stripe_session_id = ?,
            updated_at = datetime('now')
        WHERE id = ?
      `;

      db.run(updateInvoiceQuery, [sessionId, invoiceId], function(err) {
        if (err) {
          console.error('Error updating invoice:', err);
          return res.status(500).json({
            success: false,
            message: 'Failed to update invoice status'
          });
        }

        // Update checkout session status
        const updateSessionQuery = `
          UPDATE checkout_sessions 
          SET status = 'completed', 
              completed_at = datetime('now')
          WHERE stripe_session_id = ?
        `;

        db.run(updateSessionQuery, [sessionId], function(err) {
          if (err) {
            console.error('Error updating session:', err);
          }
        });

        db.close();

        res.json({
          success: true,
          message: 'Payment processed successfully',
          invoice: {
            id: invoiceId,
            status: 'paid',
            paymentDate: new Date().toISOString()
          }
        });
      });

    } else {
      res.status(400).json({
        success: false,
        message: 'Payment not completed'
      });
    }

  } catch (error) {
    console.error('Error processing payment success:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process payment',
      error: error.message
    });
  }
});

// Get payment status
router.get('/status/:invoiceId', authenticateToken, (req, res) => {
  const { invoiceId } = req.params;
  const db = getDb();

  const query = `
    SELECT i.*, cs.stripe_session_id, cs.status as payment_status
    FROM invoices i
    LEFT JOIN checkout_sessions cs ON i.id = cs.invoice_id
    WHERE i.id = ?
  `;

  db.get(query, [invoiceId], (err, row) => {
    if (err) {
      console.error('Error fetching payment status:', err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (!row) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({ success: true, data: row });
  });

  db.close();
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment succeeded:', session.id);
      
      // Update database with successful payment
      const db = getDb();
      const updateQuery = `
        UPDATE invoices 
        SET status = 'paid', 
            payment_date = datetime('now'),
            stripe_session_id = ?
        WHERE id = ?
      `;

      db.run(updateQuery, [session.id, session.metadata.invoiceId], function(err) {
        if (err) {
          console.error('Error updating invoice from webhook:', err);
        }
      });

      db.close();
      break;

    case 'payment_intent.payment_failed':
      const paymentIntent = event.data.object;
      console.log('Payment failed:', paymentIntent.id);
      break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({received: true});
});

module.exports = router;
