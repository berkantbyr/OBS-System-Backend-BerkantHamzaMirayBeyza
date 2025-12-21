# Payment Integration Guide

## Payment Flow Diagram

```
User → Frontend → Backend → Payment Gateway → Webhook → Backend → Wallet Update
```

### Detailed Flow:
1. User requests wallet top-up
2. Backend creates payment session
3. User redirected to payment gateway
4. User completes payment
5. Payment gateway sends webhook
6. Backend verifies webhook signature
7. Backend processes payment and updates wallet
8. User receives confirmation

## Stripe Setup

### 1. Install Stripe SDK
```bash
npm install stripe
```

### 2. Environment Variables
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
PAYMENT_GATEWAY=stripe
```

### 3. Implementation Example
```javascript
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async createTopupSession(walletId, amount, userInfo) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'try',
        product_data: { name: 'Cüzdan Yükleme' },
        unit_amount: amount * 100,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${process.env.FRONTEND_URL}/wallet/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/wallet/cancel`,
    metadata: { walletId, userId: userInfo.id },
  });
  
  return {
    paymentId: session.id,
    paymentUrl: session.url,
    amount,
    currency: 'TRY',
    expiresAt: new Date(session.expires_at * 1000),
  };
}

verifyWebhookSignature(signature, payload) {
  const event = stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  return event;
}
```

## PayTR Setup

### 1. Environment Variables
```env
PAYTR_MERCHANT_ID=your_merchant_id
PAYTR_MERCHANT_KEY=your_merchant_key
PAYTR_MERCHANT_SALT=your_merchant_salt
PAYMENT_GATEWAY=paytr
```

### 2. Implementation Example
```javascript
const crypto = require('crypto');

async createTopupSession(walletId, amount, userInfo) {
  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const hashString = `${process.env.PAYTR_MERCHANT_ID}${userInfo.email}${amount}${paymentId}`;
  const hash = crypto
    .createHmac('sha256', process.env.PAYTR_MERCHANT_KEY)
    .update(hashString)
    .digest('base64');
  
  // Create PayTR payment request
  // ... PayTR API integration
  
  return {
    paymentId,
    paymentUrl: paytrPaymentUrl,
    amount,
    currency: 'TRY',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  };
}
```

## Webhook Implementation

### Stripe Webhook Handler
```javascript
app.post('/api/v1/wallet/topup/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    const event = paymentService.verifyWebhookSignature(signature, req.body);
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const paymentData = {
        walletId: session.metadata.walletId,
        amount: session.amount_total / 100,
        paymentId: session.id,
        metadata: session.metadata,
      };
      
      await paymentService.processPaymentWebhook(paymentData);
    }
    
    res.json({received: true});
  } catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }
});
```

### PayTR Webhook Handler
```javascript
app.post('/api/v1/wallet/topup/webhook', async (req, res) => {
  const { merchant_oid, status, total_amount, hash } = req.body;
  
  // Verify hash
  const hashString = `${process.env.PAYTR_MERCHANT_ID}${merchant_oid}${total_amount}`;
  const calculatedHash = crypto
    .createHmac('sha256', process.env.PAYTR_MERCHANT_KEY)
    .update(hashString)
    .digest('base64');
  
  if (hash !== calculatedHash) {
    return res.status(400).json({success: false, message: 'Invalid hash'});
  }
  
  if (status === 'success') {
    const paymentData = {
      walletId: req.body.walletId, // Extract from merchant_oid or metadata
      amount: total_amount / 100,
      paymentId: merchant_oid,
      metadata: req.body,
    };
    
    await paymentService.processPaymentWebhook(paymentData);
  }
  
  res.json({success: true});
});
```

## Test Cards

### Stripe Test Cards
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0027 6000 3184`

### PayTR Test Cards
- Use PayTR test environment credentials
- Test cards provided in PayTR dashboard

## Security Considerations

1. **Webhook Signature Verification:** Always verify webhook signatures
2. **Idempotency:** Check for duplicate transactions
3. **HTTPS:** Use HTTPS for all payment endpoints
4. **Environment Variables:** Never commit API keys to version control
5. **Error Handling:** Log all payment errors for audit trail

## Testing

1. Use test mode for development
2. Test webhook with Stripe CLI: `stripe listen --forward-to localhost:3000/api/v1/wallet/topup/webhook`
3. Test payment flow end-to-end
4. Verify wallet balance updates correctly
5. Test error scenarios (declined cards, network errors)

