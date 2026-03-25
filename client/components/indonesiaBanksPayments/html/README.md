# IndonesiaBanks One-Time Payment Integration

This example demonstrates how to integrate IndonesiaBanks payments using PayPal's v6 Web SDK. IndonesiaBanks allows customers in Indonesia to pay via their local bank apps.

## Architecture Overview

This sample demonstrates a complete IndonesiaBanks integration flow:

1. Initialize PayPal Web SDK with the IndonesiaBanks component
2. Check eligibility for IndonesiaBanks payment method
3. Create IndonesiaBanks payment session with required payment fields
4. Validate customer name, email, and phone before initiating payment
5. Create a PayPal order with `ORDER_COMPLETE_ON_PAYMENT_APPROVAL` processing instruction
6. Authorize the payment through the IndonesiaBanks popup flow
7. Handle payment approval, cancellation, and errors

## Features

- IndonesiaBanks one-time payment integration
- Full name and email field validation via PayPal SDK payment fields
- Phone number input (country code + national number)
- Popup payment flow
- Eligibility checking for IndonesiaBanks
- Error handling and user feedback
- IDR (Indonesian Rupiah) currency support

## Prerequisites

### 1. PayPal Developer Account Setup

1. **PayPal Developer Account**
   - Visit [developer.paypal.com](https://developer.paypal.com)
   - Sign up or log in and navigate to **Apps & Credentials**

2. **Create a PayPal Application**
   - Click **Create App**, select **Merchant** type, choose **Sandbox**
   - Note your **Client ID** and **Secret key** for the `.env` file

3. **Enable IndonesiaBanks**
   - Visit [sandbox.paypal.com](https://www.sandbox.paypal.com)
   - Go to **Account Settings** → **Payment methods**
   - Enable **IndonesiaBanks** and configure your account for **IDR** currency

### 2. System Requirements

- Node.js version 20 or higher
- Server running on port 8080 (see `server/node/` directory)

## Running the Demo

### Server Setup

1. Navigate to `server/node` and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file:
   ```env
   PAYPAL_SANDBOX_CLIENT_ID=your_paypal_sandbox_client_id
   PAYPAL_SANDBOX_CLIENT_SECRET=your_paypal_sandbox_client_secret
   ```

3. Start the server:
   ```bash
   npm start
   ```

### Client Setup

Open `http://localhost:8080` and click the **IndonesiaBanks Payments** link.

## How It Works

### Geographic Availability

IndonesiaBanks is available in Indonesia.

### Client-Side Flow

1. **SDK Initialization**: Loads PayPal Web SDK with the `indonesiabanks-payments` component. `testBuyerCountry` is set to `"ID"`.
2. **Eligibility Check**: Verifies IndonesiaBanks is eligible using `isEligible("indonesia_banks")` with IDR currency.
3. **Session Creation**: Creates a session via `createIndonesiaBanksOneTimePaymentSession`.
4. **Field Setup**: Mounts name and email fields from the SDK.
5. **Validation**: Validates all fields (name, email, phone) before payment.
6. **Order & Payment**: Creates an order server-side with `ORDER_COMPLETE_ON_PAYMENT_APPROVAL`, then opens the popup with the phone number passed alongside the orderId.
7. **Completion**: Fetches order details after approval.

### Server-Side Requirements

- `GET /paypal-api/auth/browser-safe-client-id`
- `POST /paypal-api/checkout/orders/create-order-for-one-time-payment`
- `GET /paypal-api/checkout/orders/:orderId`

## Troubleshooting

- Verify `testBuyerCountry` is `"ID"` and `currencyCode` is `"IDR"`
- Ensure IndonesiaBanks is enabled in PayPal account settings
- Check for popup blockers if the payment window doesn't open
- Verify the API server is running on port 8080

## Documentation

- [PayPal Developer Documentation](https://developer.paypal.com/docs/)
- [PayPal Developer Community](https://developer.paypal.com/community/)
