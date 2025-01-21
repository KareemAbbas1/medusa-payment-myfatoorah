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
        this.apiUrl = "https://apitest.myfatoorah.com"; // Base URL (test/live)
        this.apiToken = "rLtt6JWvbUHDDhsZnfpAhpYk4dxYDQkbcPTyGaKp2TYqQgG7FGZ5Th_WD53Oq8Ebz6A53njUoo1w3pjU1D4vs_ZMqFiz_j0urb_BH9Oq9VZoKFoJEDAbRZepGcQanImyYrry7Kt6MnMdgfG5jn4HngWoRdKduNNyP4kzcp3mRv7x00ahkm9LAK7ZRieg7k1PDAnBIOG3EyVSJ5kK4WLMvYr7sCwHbHcu4A5WwelxYK0GMJy37bNAarSJDFQsJ2ZvJjvMDmfWwDVFEVe_5tOomfVNt6bOg9mexbGjMrnHBnKnZR1vQbBtQieDlQepzTZMuQrSuKn-t5XZM7V6fCW7oP-uXGX-sMOajeX65JOf6XVpk29DP6ro8WTAflCDANC193yof8-f5_EYY-3hXhJj7RBXmizDpneEQDSaSz5sFk0sV5qPcARJ9zGG73vuGFyenjPPmtDtXtpx35A-BVcOSBYVIWe9kndG3nclfefjKEuZ3m4jL9Gg1h2JBvmXSMYiZtp9MR5I6pvbvylU_PP5xJFSjVTIz7IQSjcVGO41npnwIxRXNRxFOdIUHn0tjQ-7LwvEcTXyPsHXcMD8WtgBh-wxR8aKX7WPSsT1O8d8reb2aR7K3rkV3K82K_0OgawImEpwSvp9MNKynEAJQS6ZHe_J_l77652xwPNxMRTMASk1ZsJL"; // API Token
        this.storeUrl = "https://fourpets.co"; // Store URL
        // this.apiUrl = "https://api-sa.myfatoorah.com/"; // Base URL (test/live)
        // this.apiToken = "Zl7pXVb4cpPKxSg3tF8p6Tdtxu3Gj6RFgYK3TP9VJj21ecD9ZRjYgBN5jmjj0O2WJXIAnOLoJ8ZLuXX91gsy8XCeVSDMhTyqHJ8fTYpHf9wCsdE-wlcILACTl8W6RTYf5Bf-t_FMHK13xZ21PYIJ6ISLtZmM_l1lHYjvv4132BPNf-ePAGHl5JVxSEMIfCuy0x_KQSWnrNQ3veERBB46SLl-iGLSgPGxJmGaIQoomm71J5lVNJflFk7i4zxv6DmANwxjej9ho7au47x7P0aZFpuDxFQViA7CW0awY7fPSc4L-gdL1AODX0KVJrG9OuLo7RwJ49mlj4bQYILZTgpwrh6cvBFt_VS2O5p0D7GcHGviFK9ieQmmD260mPBXequ79IXUc0SqE9fuRAqCytijWk_nQK9xwWkQ_niNHdCNjFzCS5n9l9vykwSYBM4OcVWHZnPPuhIkwdJ21b4rXVA8UbX6QNTD_4CAaKIedu-hBvxAOinU4283aoe4Ifc3x3oTCk7VFs6pLEuYyc2tkpUjU0E-lJmNH0O0VoxlBALuBKk7N1bDfHYrX0LXGG69h_oftxXRDpo9WXJI0co_ssM5Lor9WuhjGGRj1PPH45Fw5TDOvWmf0YdLQzVVike-l4rZmTK4w1_HzQ1abPHTezazCmy0YJr-U-R7kJib3Z99krlFq2Yo"; // API Token
        // this.storeUrl = "https://fourpets.co"; // Store URL
        // this.apiUrl = options.api_url; // Base URL (test/live)
        // this.apiToken = options.api_token; // API Token
        // this.storeUrl = options.store_url; // Store URم
    }

    async initiatePayment(
        context: PaymentProcessorContext
    ): Promise<PaymentProcessorError | PaymentProcessorSessionResponse> {
        try {
            console.log("Myfatooorah initiate payment context", context);

            const cleanedPhone = context?.customer?.phone?.replace(/[^\d]/g, ""); // Remove non-numeric characters
            const last11Digits = cleanedPhone?.slice(-11); // Extract the last 11 digits

            if (!last11Digits || last11Digits.length !== 11) {
                console.error("Invalid phone number: must be exactly 11 digits.");
            } else {
                console.log("Phone number for backend:", last11Digits);
            }


            // validate name
            let customerName: string;
            if (!context?.customer || context?.customer?.first_name.trim() === "" || context?.customer?.last_name.trim() === "") {
                customerName = "Unknown Customer";
            } else {
                customerName = `${context?.customer?.first_name} ${context?.customer?.last_name}`;
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
                    InvoiceValue: (context?.amount / 100).toFixed(2), // Ensure two decimal places
                    CustomerEmail: context?.email || "unknown@example.com",
                    MobileCountryCode: "+966",
                    CustomerMobile: context?.customer?.phone
                        ? last11Digits
                        : "0000000000", // Remove country code if present
                    CallBackUrl: `${this.storeUrl}/payment-handler?status=success&cart_id=${context?.resource_id}`,
                    ErrorUrl: `${this.storeUrl}/payment-handler?status=failed&cart_id=${context?.resource_id}`,
                    Language: "en",
                    DisplayCurrencyIso: context?.currency_code.toUpperCase(),
                }),
            });
            // const response = await fetch(`${this.apiUrl}/v2/SendPayment`, {
            //     method: "POST",
            //     headers: {
            //         Authorization: `Bearer ${this.apiToken}`,
            //         "Content-Type": "application/json",
            //     },
            //     body: JSON.stringify({
            //         CustomerName: customerName,
            //         NotificationOption: "LNK",
            //         InvoiceValue: (context?.amount / 100).toFixed(2), // Ensure two decimal places
            //         CustomerEmail: context?.email || "unknown@example.com",
            //         MobileCountryCode: "+966",
            //         CustomerMobile: context?.customer?.phone
            //             ? last11Digits
            //             : "0000000000", // Remove country code if present
            //         CallBackUrl: `${this.storeUrl}/payment-success`,
            //         ErrorUrl: `${this.storeUrl}/payment-failed`,
            //         Language: "en",
            //         DisplayCurrencyIso: context?.currency_code.toUpperCase(),
            //     }),
            // });
            // console.log("Payload", {
            //     CustomerName: customerName,
            //     NotificationOption: "LNK",
            //     InvoiceValue: (context?.amount / 100).toFixed(2), // Ensure two decimal places
            //     CustomerEmail: context?.email || "unknown@example.com",
            //     MobileCountryCode: "+966",
            //     CustomerMobile: context?.customer?.phone
            //         ? context?.customer?.phone.replace(/^\+966|2|20/, "")
            //         : "0000000000", // Remove country code if present
            //     CallBackUrl: `${this.storeUrl}/payment-success`,
            //     ErrorUrl: `${this.storeUrl}/payment-failed`,
            //     Language: "en",
            //     DisplayCurrencyIso: context?.currency_code.toUpperCase(),
            // })

            if (!response.ok) {
                // console.error("API Error Response:", response);
                const errorData = await response.json();
                console.error("API Error Response:", errorData);
                throw new Error(`Failed to initiate MyFatoorah payment: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Initiate MyFatoorah Payment Data", data);
            return {
                session_data: {
                    status: "pending",
                    invoiceURL: data?.Data.InvoiceURL, // Send this to the frontend
                    invoiceId: data?.Data.InvoiceId, // Save paymentId for later actions
                    cart_id: context?.resource_id,
                },
            };
        } catch (error) {
            console.error("Initiate Payment Error:", error);
            return {
                error: "An error occurred during MyFatoorah initiation",
                code: "myfatoorah_initiation_error",
            };
        }
    }

    async authorizePayment(
        paymentSessionData: Record<string, unknown>,
        context: Record<string, unknown>
    ): Promise<PaymentProcessorError | { status: PaymentSessionStatus; data: PaymentProcessorSessionResponse["session_data"]; }> {
        try {
            console.log("Context auth", context)
            console.log("Auth data", paymentSessionData);
            // Implement your authorization logic here
            const invoiceId = paymentSessionData.invoiceId; // Ensure paymentId is stored in session_data
            console.log("DAta", paymentSessionData)
            if (!invoiceId) {
                throw new Error("Missing invoiceId in MyFatoorah session data");
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

            console.log("Resposne", response)

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error Response Authorize payment:", errorData);
                throw new Error(`Failed to authorize MyFatoorah payment: ${response.statusText}`);
            }

            const data = await response.json();
            console.log("Auth Data", data)

            const status = data.Data.InvoiceStatus.toLowerCase();

            if (status === "paid") {
                return {
                    status: PaymentSessionStatus.AUTHORIZED,
                    data: { paymentId: data.Data.InvoiceId },
                };
            }

            console.log("Authorize Payment Status", status);
            console.log("Data", data);

            return {
                error: "Payment not authorized by MyFatoorah",
                code: "myfatoorah_authorization_failed",
            };
        } catch (error) {
            console.error("Authorize Payment Error:", error);
            return {
                error: "An error occurred during MyFatoorah authorization",
                code: "myfatoorah_authorization_error",
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
                error: "An error occurred during MyFatoorah cancellation",
                code: "myfatoorah_cancellation_error",
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
                error: "An error occurred during MyFatoorah deletion",
                code: "myfatoorah_deletion_error",
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
                throw new Error("Missing invoiceId in MyFatoorah session data");
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
            throw new Error("An error occurred during MyFatoorah status retrieval");
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
                throw new Error("Missing paymentId in MyFatoorah session data");
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
                throw new Error(`Failed to process MyFatoorah refund: ${response.statusText}`);
            }

            const data = await response.json();

            return { status: "refunded", refundId: data.Data.RefundId };
        } catch (error) {
            console.error("Refund Payment Error:", error);
            return {
                error: "An error occurred during MyFatoorah refund",
                code: "myfatoorah_refund_error",
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
                throw new Error("Missing invoiceId in MyFatoorah session data");
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
                throw new Error(`Failed to Get MyFatoorah payment: ${response.statusText}`);
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
                error: "An error occurred during retrieving MyFatoorah payment",
                code: "myfatoorah_retrieve_payment_error",
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
                error: "An error occurred during MyFatoorah update",
                code: "myfatoorah_update_error",
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
                error: "An error occurred during MyFatoorah data update",
                code: "myfatoorah_data_update_error",
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
            const amount = Number(paymentSessionData["amount"]);


            console.log("Session data", paymentSessionData)

            if (!invoiceId) {
                throw new Error("Missing InvoiceId in MyFatoorah session data");
            }

            if (!amount || amount < 0) {
                throw new Error("Missing or invalid amount in MyFatoorah session data");
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
                    Amount: amount,
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
                    error: error.Message || "Failed to capture MyFatoorah payment",
                    code: "myfatoorah_capture_error",
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
                error: "An error occurred during MyFatoorah capture",
                code: "myfatoorah_capture_error",
            };
        }
    }
}

export default MyFatoorahPayment;