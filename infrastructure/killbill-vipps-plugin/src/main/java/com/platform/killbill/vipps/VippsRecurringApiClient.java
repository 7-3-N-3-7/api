package com.platform.killbill.vipps;

import com.platform.killbill.vipps.VippsPluginConfig.PayoutRoute;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Direct HTTP client for Vipps MobilePay APIs:
 * - Access Token API: POST /accesstoken/get
 * - Recurring Payments API v3: POST /recurring/v3/agreements, charges, PATCH /recurring/v3/agreements/{id}
 * - ePayment API v1: POST /epayment/v1/payments (MobilePay Wallet and Tokenized Card)
 */
public class VippsRecurringApiClient {

    private static final Pattern JSON_TOKEN_PATTERN = Pattern.compile("\"access_token\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern JSON_AGREEMENT_ID_PATTERN = Pattern.compile("\"agreementId\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern JSON_CHARGE_ID_PATTERN = Pattern.compile("\"chargeId\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern JSON_REFERENCE_PATTERN = Pattern.compile("\"reference\"\\s*:\\s*\"([^\"]+)\"");

    private final VippsPluginConfig config;
    private final HttpClient httpClient;

    public VippsRecurringApiClient(VippsPluginConfig config) {
        this.config = config;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(5))
                .build();
    }

    public VippsAgreementResult createAgreement(
            String planName,
            BigDecimal amount,
            String currency,
            String phoneNumber,
            PayoutRoute route
    ) {
        if (!config.isRemoteEnabled()) {
            String syntheticId = "agr_" + UUID.randomUUID().toString().substring(0, 8);
            return new VippsAgreementResult(syntheticId, "ACTIVE", route.vippsMsn(), route.payoutIban());
        }

        String token = fetchAccessToken(route.vippsMsn());
        long minorUnits = toMinorUnits(amount);
        String normalizedPhone = normalizePhone(phoneNumber);
        String body = "{"
                + "\"pricing\":{\"type\":\"LEGACY\",\"amount\":" + minorUnits + ",\"currency\":\"" + sanitize(currency) + "\"},"
                + "\"interval\":{\"unit\":\"MONTH\",\"count\":1},"
                + "\"productName\":\"" + sanitize(planName) + "\","
                + "\"productDescription\":\"EduJournal Kill Bill (" + sanitize(route.payoutIban()) + ")\","
                + "\"phoneNumber\":\"" + sanitize(normalizedPhone) + "\","
                + "\"scope\":\"name address email phoneNumber\""
                + "}";

        String responseBody = sendJson(
                "POST",
                "/recurring/v3/agreements",
                token,
                route.vippsMsn(),
                body
        );
        String agreementId = extractField(JSON_AGREEMENT_ID_PATTERN, responseBody, "agr_" + UUID.randomUUID().toString().substring(0, 8));
        return new VippsAgreementResult(agreementId, "ACTIVE", route.vippsMsn(), route.payoutIban());
    }

    public VippsChargeResult createCharge(
            String agreementId,
            BigDecimal amount,
            String currency,
            String description,
            PayoutRoute route
    ) {
        if (!config.isRemoteEnabled()) {
            String chargeId = "chg_" + UUID.randomUUID().toString().substring(0, 8);
            return new VippsChargeResult(chargeId, agreementId, "CHARGED");
        }

        String token = fetchAccessToken(route.vippsMsn());
        long minorUnits = toMinorUnits(amount);
        String body = "{"
                + "\"amount\":" + minorUnits + ","
                + "\"currency\":\"" + sanitize(currency) + "\","
                + "\"transactionType\":\"DIRECT_CAPTURE\","
                + "\"description\":\"" + sanitize(description) + "\","
                + "\"due\":\"" + java.time.LocalDate.now().plusDays(1) + "\","
                + "\"retryDays\":2"
                + "}";

        String responseBody = sendJson(
                "POST",
                "/recurring/v3/agreements/" + agreementId + "/charges",
                token,
                route.vippsMsn(),
                body
        );
        String chargeId = extractField(JSON_CHARGE_ID_PATTERN, responseBody, "chg_" + UUID.randomUUID().toString().substring(0, 8));
        return new VippsChargeResult(chargeId, agreementId, "CHARGED");
    }

    public void stopAgreement(String agreementId, PayoutRoute route) {
        if (!config.isRemoteEnabled()) {
            return;
        }
        String token = fetchAccessToken(route.vippsMsn());
        sendJson(
                "PATCH",
                "/recurring/v3/agreements/" + agreementId,
                token,
                route.vippsMsn(),
                "{\"status\":\"STOPPED\"}"
        );
    }

    public VippsChargeResult createEPayment(
            String paymentMethod,
            BigDecimal amount,
            String currency,
            String reference,
            String maskedInstrument,
            PayoutRoute route
    ) {
        if (!config.isRemoteEnabled()) {
            return new VippsChargeResult("epay_" + UUID.randomUUID().toString().substring(0, 8), reference, "CAPTURED");
        }

        String token = fetchAccessToken(route.vippsMsn());
        long minorUnits = toMinorUnits(amount);
        String vippsMethodType = "CREDIT_CARD".equalsIgnoreCase(paymentMethod) ? "CARD" : "WALLET";
        String body = "{"
                + "\"amount\":{\"currency\":\"" + sanitize(currency) + "\",\"value\":" + minorUnits + "},"
                + "\"paymentMethod\":{\"type\":\"" + vippsMethodType + "\"},"
                + "\"reference\":\"" + sanitize(reference) + "\","
                + "\"paymentDescription\":\"EduJournal (" + sanitize(maskedInstrument) + " -> " + sanitize(route.payoutIban()) + ")\""
                + "}";

        String responseBody = sendJson(
                "POST",
                "/epayment/v1/payments",
                token,
                route.vippsMsn(),
                body
        );
        String ref = extractField(JSON_REFERENCE_PATTERN, responseBody, reference);
        return new VippsChargeResult(ref, reference, "CAPTURED");
    }

    public String fetchAccessToken(String merchantSerialNumber) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(config.getApiBaseUrl() + "/accesstoken/get"))
                    .timeout(Duration.ofSeconds(5))
                    .header("client_id", config.getClientId())
                    .header("client_secret", config.getClientSecret())
                    .header("Ocp-Apim-Subscription-Key", config.getSubscriptionKey())
                    .header("Merchant-Serial-Number", merchantSerialNumber)
                    .POST(HttpRequest.BodyPublishers.noBody())
                    .build();

            HttpResponse<String> response = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new IllegalStateException("Vipps /accesstoken/get returned HTTP " + response.statusCode());
            }
            return extractField(JSON_TOKEN_PATTERN, response.body(), "sandbox-bearer-token");
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Failed to fetch Vipps MobilePay access token", e);
        }
    }

    private String sendJson(
            String method,
            String path,
            String bearerToken,
            String merchantSerialNumber,
            String jsonBody
    ) {
        try {
            HttpRequest req = HttpRequest.newBuilder()
                    .uri(URI.create(config.getApiBaseUrl() + path))
                    .timeout(Duration.ofSeconds(5))
                    .header("Authorization", "Bearer " + bearerToken)
                    .header("Ocp-Apim-Subscription-Key", config.getSubscriptionKey())
                    .header("Merchant-Serial-Number", merchantSerialNumber)
                    .header("Idempotency-Key", UUID.randomUUID().toString())
                    .header("Content-Type", "application/json")
                    .method(method, HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            HttpResponse<String> response = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 400) {
                throw new IllegalStateException("Vipps API " + path + " returned HTTP " + response.statusCode());
            }
            return response.body();
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Failed communicating with Vipps MobilePay API at " + path, e);
        }
    }

    private static long toMinorUnits(BigDecimal amount) {
        return amount.multiply(BigDecimal.valueOf(100)).longValue();
    }

    private static String normalizePhone(String phone) {
        if (phone == null || phone.isBlank()) {
            return "4520123456";
        }
        return phone.replaceAll("[^0-9]", "");
    }

    private static String sanitize(String input) {
        return input == null ? "" : input.replace("\"", "").replace("\\", "");
    }

    private static String extractField(Pattern pattern, String body, String fallback) {
        if (body == null) {
            return fallback;
        }
        Matcher matcher = pattern.matcher(body);
        return matcher.find() ? matcher.group(1) : fallback;
    }

    public record VippsAgreementResult(String agreementId, String status, String vippsMsn, String payoutIban) {}

    public record VippsChargeResult(String chargeId, String externalReference, String status) {}
}
