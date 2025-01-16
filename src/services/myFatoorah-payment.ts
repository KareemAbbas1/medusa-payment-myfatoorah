import {
    AbstractPaymentProcessor,
    PaymentProcessorContext,
    PaymentProcessorError,
    PaymentProcessorSessionResponse,
    PaymentSessionStatus
} from "@medusajs/medusa";

class MyFatoorahPayment extends AbstractPaymentProcessor {
    static identifier = "myFatoorah-payment";

    private apiUrl: string;
    private apiToken: string;
    private storeUrl: string;

    constructor(container, options) {
        super(container);
        this.apiUrl = options.api_url; // Base URL (test/live)
        this.apiToken = options.api_token; // API Token
        this.storeUrl = options.store_url; // Store URL
    }

    async initiatePayment(
        context: PaymentProcessorContext
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
        try {

            // validate name
            let customerName: string;
            if (!context.customer || context.customer.first_name.trim() === "" || context.customer.last_name.trim() === "") {
                customerName = "Unknown Customer";
            } else {
                customerName = `${context.customer.first_name} ${context.customer.last_name}`;
            }

            const response = await fetch(`${this.apiUrl}/v2/SendPayment`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    CustomerName: customerName,
                    NotificationOption: "LNK",
                    InvoiceValue: (context.amount / 100).toFixed(2), // Ensure two decimal places
                    CustomerEmail: context.email || "unknown@example.com",
                    MobileCountryCode: "+966",
                    CustomerMobile: context.customer.phone
                        ? context.customer.phone.replace(/^\+966/, "")
                        : "0000000000", // Remove country code if present
                    CallBackUrl: `${this.storeUrl}/payment-success`,
                    ErrorUrl: `${this.storeUrl}/payment-failed`,
                    Language: "en",
                    DisplayCurrencyIso: context.currency_code.toUpperCase(),
                }),
            });
            // console.log("Payload", {
            //     CustomerName: customerName,
            //     NotificationOption: "LNK",
            //     InvoiceValue: (context.amount / 100).toFixed(2), // Ensure two decimal places
            //     CustomerEmail: context.email || "unknown@example.com",
            //     MobileCountryCode: "+966",
            //     CustomerMobile: context.customer.phone
            //         ? context.customer.phone.replace(/^\+966/, "")
            //         : "0000000000", // Remove country code if present
            //     CallBackUrl: `${this.storeUrl}/payment-success`,
            //     ErrorUrl: `${this.storeUrl}/payment-failed`,
            //     Language: "en",
            //     DisplayCurrencyIso: context.currency_code.toUpperCase(),
            // })

            if (!response.ok) {
                console.error("API Error Response:", response);
                const errorData = await response.json();
                console.error("API Error Response:", errorData);
                throw new Error(`Failed to initiate payment: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log("Initiate Payment Data", data);
            return {
                session_data: {
                    status: "pending",
                    invoiceURL: data?.Data.InvoiceURL, // Send this to the frontend
                    invoiceId: data?.Data.InvoiceId, // Save paymentId for later actions
                },
            };
        } catch (error) {
            console.error("Initiate Payment Error:", error);
            return {
                error: "An error occurred during initiation",
                code: "initiation_error",
            };
        }
    }

    async authorizePayment(
        paymentSessionData: Record<string, unknown>,
        context: Record<string, unknown>
    ): Promise<PaymentProcessorError | { status: PaymentSessionStatus; data: PaymentProcessorSessionResponse["session_data"]; }> {
        try {
            // Implement your authorization logic here
            const invoiceId = paymentSessionData.invoiceId; // Ensure paymentId is stored in session_data

            if (!invoiceId) {
                throw new Error("Missing invoiceId in session data");
            }

            const response = await fetch(`${this.apiUrl}/v2/GetPaymentStatus`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    KeyType: "InvoiceId",
                    Key: invoiceId,
                }),
            });


            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error Response Authorize payment:", errorData);
                throw new Error(`Failed to authorize payment: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log("Data", data)

            const status = data.Data.InvoiceStatus.toLowerCase();

            if (status === "paid") {
                return {
                    status: PaymentSessionStatus.AUTHORIZED,
                    data: { paymentId: data.Data.InvoiceId },
                };
            }

            return {
                error: "Payment not authorized",
                code: "authorization_failed",
            };
        } catch (error) {
            console.error("Authorize Payment Error:", error);
            return {
                error: "An error occurred during authorization",
                code: "authorization_error",
            };
        }
    }

    async cancelPayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]> {
        try {
            // Implement your cancellation logic here
            return { status: "cancelled" };
        } catch (error) {
            console.error("Cancel Payment Error:", error);
            return {
                error: "An error occurred during cancellation",
                code: "cancellation_error",
            };
        }
    }

    async deletePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]> {
        try {
            // Implement your deletion logic here
            return { status: "deleted" };
        } catch (error) {
            console.error("Delete Payment Error:", error);
            return {
                error: "An error occurred during deletion",
                code: "deletion_error",
            };
        }
    }

    async getPaymentStatus(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentSessionStatus> {
        try {
            // Implement your status retrieval logic here
            const invoiceId = paymentSessionData.paymentId; // Ensure invoiceId is stored in session_data
            // console.log("payemntsessiondata", paymentSessionData)
            if (!invoiceId) {
                throw new Error("Missing invoiceId in session data");
            }

            const response = await fetch(`${this.apiUrl}/v2/getPaymentStatus`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    KeyType: "InvoiceId",
                    Key: invoiceId,
                }),
            });

            // console.log("REs", response)
            if (!response.ok) {
                throw new Error(`Failed to get payment status: ${response.statusText}`);
            }

            const data = await response.json();
            const status = data.Data.InvoiceStatus.toLowerCase();

            switch (status) {
                case "paid":
                    return PaymentSessionStatus.AUTHORIZED;
                case "pending":
                    return PaymentSessionStatus.PENDING;
                case "failed":
                    return PaymentSessionStatus.REQUIRES_MORE;
                default:
                    return PaymentSessionStatus.PENDING;
            }
        } catch (error) {
            console.error("Get Payment Status Error:", error);
            throw new Error("An error occurred during status retrieval");
        }
    }

    async refundPayment(
        paymentSessionData: Record<string, unknown>,
        refundAmount: number
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]> {
        try {
            // Implement your refund logic here
            const paymentId = paymentSessionData.paymentId; // Ensure paymentId is stored in session_data

            if (!paymentId) {
                throw new Error("Missing paymentId in session data");
            }

            const response = await fetch(`${this.apiUrl}/v2/MakeRefund`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    KeyType: "PaymentId",
                    Key: paymentId,
                    RefundAmount: refundAmount / 100, // Convert cents to major currency units
                    RefundReason: "Customer request",
                }),
            });

            if (!response.ok) {
                throw new Error(`Failed to process refund: ${response.statusText}`);
            }

            const data = await response.json();

            return { status: "refunded", refundId: data.Data.RefundId };
        } catch (error) {
            console.error("Refund Payment Error:", error);
            return {
                error: "An error occurred during refund",
                code: "refund_error",
            };
        }
    }

    async retrievePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]> {
        try {
            // Implement your authorization logic here
            const invoiceId = paymentSessionData.paymentId; // Ensure paymentId is stored in session_data
            // console.log("Auth data", paymentSessionData);
            if (!invoiceId) {
                throw new Error("Missing invoiceId in session data");
            }

            const response = await fetch(`${this.apiUrl}/v2/GetPaymentStatus`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.apiToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    KeyType: "InvoiceId",
                    Key: invoiceId,
                }),
            });

            // console.log("REt response", response);
            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error Response Get payment:", errorData);
                throw new Error(`Failed to Get payment: ${response.statusText}`);
            }

            const data = await response.json();
            // console.log("Data", data)

            const status = data.Data.InvoiceStatus.toLowerCase();


            return {
                status: status,
                paymentId: data.Data.InvoiceId,
                amount: data.Data.InvoiceValue,
                key: data.Data.InvoiceId,
                keyType: "InvoiceId",
            };

        } catch (error) {
            console.error("Get Payment Error:", error);
            return {
                error: "An error occurred during retrieving payment",
                code: "retrieve_payment_error",
            };
        }
    }


    async updatePayment(context: PaymentProcessorContext): Promise<PaymentProcessorError | PaymentProcessorSessionResponse | void> {
        try {
            // Implement your update logic here
            return { session_data: {} };
        } catch (error) {
            console.error("Update Payment Error:", error);
            return {
                error: "An error occurred during update",
                code: "update_error",
            };
        }
    }

    async updatePaymentData(sessionId: string, data: Record<string, unknown>): Promise<PaymentProcessorError | PaymentProcessorSessionResponse["session_data"]> {
        try {
            // Implement your data update logic here
            return { status: "data_updated" };
        } catch (error) {
            console.error("Update Payment Data Error:", error);
            return {
                error: "An error occurred during data update",
                code: "data_update_error",
            };
        }
    }

    async capturePayment(
        paymentSessionData: Record<string, unknown>
    ): Promise<Record<string, unknown> | PaymentProcessorError> {
        try {
            // Implement your capture logic here
            // Assuming `paymentSessionData` contains the `InvoiceId`
            const invoiceId = paymentSessionData["key"];

            console.log("Session data", paymentSessionData)

            if (!invoiceId) {
                throw new Error("Missing InvoiceId in session data");
            }

            // Construct the API request to capture the payment
            const response = await fetch(`${this.apiUrl}/v2/UpdatePaymentStatus`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${this.apiToken}`,
                },
                body: JSON.stringify({
                    Operation: "capture",
                    Amount: paymentSessionData.amount,
                    Key: invoiceId,
                    KeyType: "InvoiceId",
                }),
            });

            console.log("Capture request data", JSON.stringify({
                Operation: "capture",
                Amount: paymentSessionData.amount,
                Key: invoiceId,
                KeyType: "InvoiceId",
            }),)

            console.log("Capture response", response)

            if (!response.ok) {
                const error = await response.json();
                console.error("Error capturing payment", error)
                return {
                    error: error.Message || "Failed to capture payment",
                    code: "capture_error",
                };
            }

            const result = await response.json();
            console.log("Result", result)

            return {
                status: "captured",
                ...result,
            };
        } catch (error) {
            console.error("Capture Payment Error:", error);
            return {
                error: "An error occurred during capture",
                code: "capture_error",
            };
        }
    }
}

export default MyFatoorahPayment;