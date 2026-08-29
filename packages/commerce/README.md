# @khepree/commerce — Orders, payments, subscriptions

Provider-agnostic commerce. Catalog → checkout → order → payment → **normalized commerce event**. Entitlement is not granted here.

```typescript
import { createCommerceService } from "@khepree/commerce";

const commerce = createCommerceService();
await commerce.createCheckoutIntent({ owner, planPublicId, pricePublicId, locale, successUrl, cancelUrl });
await commerce.processWebhook({ providerId, headers, rawBody });
```

## PaymentProvider

`createCheckout()` · `verifyWebhook()` · `normalizeWebhookEvent()` · `refund()`

First adapter: `MockDevelopmentPaymentProvider`. Provider SDK types do not belong on orders or payments.

## Webhooks

`POST /api/v1/webhooks/payments/[provider]`

Verify → persist unique `(provider, eventId)` → apply in a transaction → audit. Retry-safe. Duplicate event ids are no-ops.

Success redirect URLs must not confirm payment.
