async function onPayPalWebSdkLoaded() {
  try {
    const clientId = await getBrowserSafeClientId();
    const sdkInstance = await window.paypal.createInstance({
      clientId,
      testBuyerCountry: "ID", // Indonesia for Indomaret testing
      components: ["indomaret-payments"],
    });

    // Check if Indomaret is eligible
    const paymentMethods = await sdkInstance.findEligibleMethods({
      currencyCode: "IDR",
    });

    const isIndomaretEligible = paymentMethods.isEligible("indomaret");

    if (isIndomaretEligible) {
      setupIndomaretPayment(sdkInstance);
    } else {
      showMessage({
        text: "Indomaret is not eligible. Please ensure your buyer country is Indonesia and currency is IDR.",
        type: "error",
      });
      console.error("Indomaret is not eligible");
    }
  } catch (error) {
    console.error("Error initializing PayPal SDK:", error);
    showMessage({
      text: "Failed to initialize payment system. Please try again.",
      type: "error",
    });
  }
}

function setupIndomaretPayment(sdkInstance) {
  try {
    // Create Indomaret checkout session
    const indomaretCheckout = sdkInstance.createIndomaretOneTimePaymentSession({
      onApprove: handleApprove,
      onCancel: handleCancel,
      onError: handleError,
    });

    // Setup payment fields
    setupPaymentFields(indomaretCheckout);

    // Setup button click handler
    setupButtonHandler(indomaretCheckout);
  } catch (error) {
    console.error("Error setting up Indomaret payment:", error);
    showMessage({
      text: "Failed to setup payment. Please refresh the page.",
      type: "error",
    });
  }
}

function setupPaymentFields(indomaretCheckout) {
  const fullNameField = indomaretCheckout.createPaymentFields({
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

  const emailField = indomaretCheckout.createPaymentFields({
    type: "email",
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

  document.querySelector("#indomaret-full-name").appendChild(fullNameField);
  document.querySelector("#indomaret-email").appendChild(emailField);
}

function setupButtonHandler(indomaretCheckout) {
  const indomaretButton = document.querySelector("#indomaret-button");
  indomaretButton.removeAttribute("hidden");
  document.querySelector("#custom-fields").removeAttribute("hidden");

  indomaretButton.addEventListener("click", async () => {
    try {
      const phoneData = validatePhoneFields();
      const isValid = await indomaretCheckout.validate();

      if (isValid) {
        await indomaretCheckout.start(
          { presentationMode: "popup" },
          createOrderWithPhone(phoneData),
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

function validatePhoneFields() {
  const phoneCountryCode = document
    .querySelector("#phone-country-code")
    .value.trim();
  const phoneNationalNumber = document
    .querySelector("#phone-national-number")
    .value.trim();

  const errors = [];

  if (!phoneCountryCode) errors.push("Phone Country Code");
  if (!phoneNationalNumber) errors.push("Phone National Number");

  if (errors.length > 0) {
    const errorMessage = `The following fields are required: ${errors.join(", ")}`;
    throw new Error(errorMessage);
  }

  return { phoneCountryCode, phoneNationalNumber };
}

// Create PayPal order and return session options with phone data
async function createOrderWithPhone(phoneData) {
  try {
    console.log("Creating PayPal order for Indomaret...");
    const orderPayload = {
      intent: "CAPTURE",
      processing_instruction: "ORDER_COMPLETE_ON_PAYMENT_APPROVAL",
      purchase_units: [
        {
          reference_id: "d9f80740-38f0-11e8-b467-0ed5f89f718b",
          amount: {
            currency_code: "IDR",
            value: "10000000.00",
            breakdown: {
              item_total: {
                currency_code: "IDR",
                value: "10000000.00",
              },
              shipping: {
                currency_code: "IDR",
                value: "0.00",
              },
              handling: {
                currency_code: "IDR",
                value: "0.00",
              },
              tax_total: {
                currency_code: "IDR",
                value: "0.00",
              },
              shipping_discount: {
                currency_code: "IDR",
                value: "0.00",
              },
            },
          },
          items: [
            {
              name: "Gold Hat",
              unit_amount: {
                currency_code: "IDR",
                value: "10000000.00",
              },
              quantity: "1",
              description: "Large Brown hat.",
              sku: "259483234816",
              category: "PHYSICAL_GOODS",
            },
          ],
          shipping: {
            address: {
              address_line_1: "Jl. Jendral Sudirman No. 45",
              admin_area_2: "Jakarta Selatan",
              postal_code: "12190",
              country_code: "ID",
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

    return {
      orderId: id,
      phone: {
        countryCode: phoneData.phoneCountryCode,
        nationalNumber: phoneData.phoneNationalNumber,
      },
    };
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
