async function onPayPalWebSdkLoaded() {
  try {
    const clientId = await getBrowserSafeClientId();
    const sdkInstance = await window.paypal.createInstance({
      clientId,
      testBuyerCountry: "PL", // Poland for BLIK Pay Later testing
      components: ["blikpaylater-payments"],
    });

    // Check if BLIK Pay Later is eligible
    const paymentMethods = await sdkInstance.findEligibleMethods({
      currencyCode: "PLN",
    });

    const isBlikPayLaterEligible = paymentMethods.isEligible("blik_pay_later");

    if (isBlikPayLaterEligible) {
      setupBlikPayLaterPayment(sdkInstance);
    } else {
      showMessage({
        text: "BLIK Pay Later is not eligible. Please ensure your buyer country is Poland and currency is PLN.",
        type: "error",
      });
      console.error("BLIK Pay Later is not eligible");
    }
  } catch (error) {
    console.error("Error initializing PayPal SDK:", error);
    showMessage({
      text: "Failed to initialize payment system. Please try again.",
      type: "error",
    });
  }
}

function setupBlikPayLaterPayment(sdkInstance) {
  try {
    // Create BLIK Pay Later checkout session
    const blikPayLaterCheckout = sdkInstance.createBlikPayLaterOneTimePaymentSession({
      onApprove: handleApprove,
      onCancel: handleCancel,
      onError: handleError,
    });

    // Setup payment fields
    setupPaymentFields(blikPayLaterCheckout);

    // Setup button click handler
    setupButtonHandler(blikPayLaterCheckout);
  } catch (error) {
    console.error("Error setting up BLIK Pay Later payment:", error);
    showMessage({
      text: "Failed to setup payment. Please refresh the page.",
      type: "error",
    });
  }
}

function setupPaymentFields(blikPayLaterCheckout) {
  // Create payment field for full name with optional prefill
  const fullNameField = blikPayLaterCheckout.createPaymentFields({
    type: "name",
    value: "", // Optional prefill value
    style: {
      variables: {
        textColor: "#333333",
        colorTextPlaceholder: "#999999",
        fontFamily: "Verdana, sans-serif",
        fontSizeBase: "14px",
      },
    },
  });

  document.querySelector("#blikpaylater-full-name").appendChild(fullNameField);
}

function setupButtonHandler(blikPayLaterCheckout) {
  const blikPayLaterButton = document.querySelector("#blikpaylater-button");
  blikPayLaterButton.removeAttribute("hidden");

  blikPayLaterButton.addEventListener("click", async () => {
    try {
      const isValid = await blikPayLaterCheckout.validate();

      if (isValid) {
        await blikPayLaterCheckout.start(
          { presentationMode: "popup" },
          createOrder(),
        );
      } else {
        console.error("Validation failed");
        showMessage({
          text: "Please fill in all required fields correctly.",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Payment error:", error);
      showMessage({
        text: error.message || "An error occurred during payment. Please try again.",
        type: "error",
      });
    }
  });
}

// Create PayPal order and return orderId
async function createOrder() {
  try {
    console.log("Creating PayPal order for BLIK Pay Later...");
    const orderPayload = {
      intent: "CAPTURE",
      processing_instruction: "ORDER_COMPLETE_ON_PAYMENT_APPROVAL",
      purchase_units: [
        {
          reference_id: "default",
          amount: {
            currency_code: "PLN",
            value: "26.10",
            breakdown: {
              item_total: {
                currency_code: "PLN",
                value: "24.10",
              },
              tax_total: {
                currency_code: "PLN",
                value: "2.00",
              },
            },
          },
          items: [
            {
              name: "Shirt",
              unit_amount: {
                currency_code: "PLN",
                value: "12.05",
              },
              tax: {
                currency_code: "PLN",
                value: "1.00",
              },
              quantity: "1",
              category: "PHYSICAL_GOODS",
            },
            {
              name: "Trouser",
              unit_amount: {
                currency_code: "PLN",
                value: "12.05",
              },
              tax: {
                currency_code: "PLN",
                value: "1.00",
              },
              quantity: "1",
              category: "PHYSICAL_GOODS",
            },
          ],
          shipping: {
            type: "SHIPPING",
            name: {
              full_name: "Luke Skywalker",
            },
            address: {
              address_line_1: "10025 Alterra Pkwy",
              address_line_2: "Suite 2400",
              admin_area_1: "TX",
              admin_area_2: "Austin",
              postal_code: "78758",
              country_code: "US",
            },
          },
        },
      ],
    };

    const response = await fetch(
      "/paypal-api/checkout/orders/create-order-for-one-time-payment",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to create order");
    }

    const { id } = await response.json();
    console.log("Order created with ID:", id);

    return { orderId: id };
  } catch (error) {
    console.error("Error creating order:", error);
    showMessage({
      text: "Failed to create order. Please try again.",
      type: "error",
    });
    throw error;
  }
}

// Get order details after approval
async function getOrder(orderId) {
  try {
    const response = await fetch(`/paypal-api/checkout/orders/${orderId}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch order details");
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching order details:", error);
    throw error;
  }
}

// Handle successful payment approval
async function handleApprove(data) {
  console.log("Payment approved:", data);

  try {
    const orderDetails = await getOrder(data.orderId);
    console.log("Order details:", orderDetails);

    showMessage({
      text: `Payment successful! Order ID: ${data.orderId}. Check console for order details.`,
      type: "success",
    });
  } catch (error) {
    console.error("Failed to fetch order details:", error);
    showMessage({
      text: "Transaction successful but failed to fetch order details.",
      type: "error",
    });
  }
}

// Handle payment cancellation
function handleCancel(data) {
  console.log("Payment cancelled:", data);
  showMessage({
    text: "Payment was cancelled. You can try again.",
    type: "error",
  });
}

// Handle payment errors
function handleError(error) {
  console.error("Payment error:", error);
  showMessage({
    text: "An error occurred during payment. Please try again or contact support.",
    type: "error",
  });
}

// Get client id from server
async function getBrowserSafeClientId() {
  try {
    const response = await fetch("/paypal-api/auth/browser-safe-client-id", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch client id");
    }

    const { clientId } = await response.json();
    return clientId;
  } catch (error) {
    console.error("Error fetching client id:", error);
    throw error;
  }
}

// Utility function to show messages to user
function showMessage({ text, type }) {
  const messageEl = document.getElementById("message");
  messageEl.textContent = text;
  messageEl.className = `message ${type} show`;
}
