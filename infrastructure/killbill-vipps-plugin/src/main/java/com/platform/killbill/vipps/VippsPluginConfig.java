package com.platform.killbill.vipps;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Locale;

/**
 * Resolves Vipps MobilePay API credentials and hardcoded payout routing destinations
 * ("therapist" and "management" access tiers) from Docker Secrets (/run/secrets/*)
 * with environment variable and sandbox defaults as fallbacks.
 */
public final class VippsPluginConfig {

    public static final String DEFAULT_SECRETS_DIR = "/run/secrets";
    public static final String DEFAULT_API_BASE_URL = "https://apitest.vipps.no";
    public static final String DEFAULT_THERAPIST_IBAN = "DK8130000012345678";
    public static final String DEFAULT_THERAPIST_MSN = "700101";
    public static final String DEFAULT_MANAGEMENT_IBAN = "DK9230000087654321";
    public static final String DEFAULT_MANAGEMENT_MSN = "700202";
    public static final String DEFAULT_CLINIC_IBAN = "DK5000400440116243";
    public static final String DEFAULT_CLINIC_MSN = "700000";

    private final Path secretsDirectory;
    private final String apiBaseUrl;
    private final String clientId;
    private final String clientSecret;
    private final String subscriptionKey;
    private final String therapistPayoutIban;
    private final String therapistVippsMsn;
    private final String managementPayoutIban;
    private final String managementVippsMsn;
    private final String clinicPayoutIban;
    private final String clinicVippsMsn;
    private final boolean remoteEnabled;

    public VippsPluginConfig() {
        this(Path.of(DEFAULT_SECRETS_DIR), false);
    }

    public VippsPluginConfig(Path secretsDirectory, boolean remoteEnabledOverride) {
        this.secretsDirectory = secretsDirectory;
        this.apiBaseUrl = readSecret("vipps_api_base_url", "VIPPS_API_BASE_URL", DEFAULT_API_BASE_URL);
        this.clientId = readSecret("vipps_client_id", "VIPPS_CLIENT_ID", "vipps-sandbox-client-id");
        this.clientSecret = readSecret("vipps_client_secret", "VIPPS_CLIENT_SECRET", "vipps-sandbox-client-secret");
        this.subscriptionKey = readSecret("vipps_subscription_key", "VIPPS_SUBSCRIPTION_KEY", "vipps-sandbox-ocp-apim-key");
        this.therapistPayoutIban = readSecret("vipps_therapist_payout_iban", "VIPPS_THERAPIST_PAYOUT_IBAN", DEFAULT_THERAPIST_IBAN);
        this.therapistVippsMsn = readSecret("vipps_therapist_vipps_msn", "VIPPS_THERAPIST_VIPPS_MSN", DEFAULT_THERAPIST_MSN);
        this.managementPayoutIban = readSecret("vipps_management_payout_iban", "VIPPS_MANAGEMENT_PAYOUT_IBAN", DEFAULT_MANAGEMENT_IBAN);
        this.managementVippsMsn = readSecret("vipps_management_vipps_msn", "VIPPS_MANAGEMENT_VIPPS_MSN", DEFAULT_MANAGEMENT_MSN);
        this.clinicPayoutIban = readSecret("vipps_clinic_default_iban", "VIPPS_CLINIC_DEFAULT_IBAN", DEFAULT_CLINIC_IBAN);
        this.clinicVippsMsn = readSecret("vipps_clinic_default_msn", "VIPPS_CLINIC_DEFAULT_MSN", DEFAULT_CLINIC_MSN);
        String remoteFlag = readSecret("vipps_remote_enabled", "VIPPS_REMOTE_ENABLED", Boolean.toString(remoteEnabledOverride));
        this.remoteEnabled = remoteEnabledOverride || Boolean.parseBoolean(remoteFlag);
    }

    public VippsPluginConfig(
            String apiBaseUrl,
            String clientId,
            String clientSecret,
            String subscriptionKey,
            String therapistPayoutIban,
            String therapistVippsMsn,
            String managementPayoutIban,
            String managementVippsMsn,
            boolean remoteEnabled
    ) {
        this.secretsDirectory = Path.of(DEFAULT_SECRETS_DIR);
        this.apiBaseUrl = fallback(apiBaseUrl, DEFAULT_API_BASE_URL);
        this.clientId = fallback(clientId, "vipps-sandbox-client-id");
        this.clientSecret = fallback(clientSecret, "vipps-sandbox-client-secret");
        this.subscriptionKey = fallback(subscriptionKey, "vipps-sandbox-ocp-apim-key");
        this.therapistPayoutIban = fallback(therapistPayoutIban, DEFAULT_THERAPIST_IBAN);
        this.therapistVippsMsn = fallback(therapistVippsMsn, DEFAULT_THERAPIST_MSN);
        this.managementPayoutIban = fallback(managementPayoutIban, DEFAULT_MANAGEMENT_IBAN);
        this.managementVippsMsn = fallback(managementVippsMsn, DEFAULT_MANAGEMENT_MSN);
        this.clinicPayoutIban = DEFAULT_CLINIC_IBAN;
        this.clinicVippsMsn = DEFAULT_CLINIC_MSN;
        this.remoteEnabled = remoteEnabled;
    }

    private String readSecret(String secretFileName, String envName, String defaultValue) {
        if (secretsDirectory != null) {
            Path secretFile = secretsDirectory.resolve(secretFileName);
            if (Files.isRegularFile(secretFile)) {
                try {
                    String content = Files.readString(secretFile, StandardCharsets.UTF_8).trim();
                    if (!content.isEmpty()) {
                        return content;
                    }
                } catch (IOException ignored) {
                    // Fall through to environment variable
                }
            }
        }
        String env = System.getenv(envName);
        if (env != null && !env.isBlank()) {
            return env.trim();
        }
        return defaultValue;
    }

    private static String fallback(String value, String defaultValue) {
        return (value == null || value.isBlank()) ? defaultValue : value.trim();
    }

    public PayoutRoute resolvePayout(String productType) {
        String normalized = productType == null ? "" : productType.trim().toUpperCase(Locale.ROOT);
        return switch (normalized) {
            case "THERAPIST_ACCESS" -> new PayoutRoute(
                    "THERAPIST_ACCESS",
                    therapistPayoutIban,
                    therapistVippsMsn,
                    "THERAPIST"
            );
            case "MANAGEMENT_ACCESS" -> new PayoutRoute(
                    "MANAGEMENT_ACCESS",
                    managementPayoutIban,
                    managementVippsMsn,
                    "ADMIN"
            );
            default -> new PayoutRoute(
                    normalized.isEmpty() ? "CLINIC_SERVICE" : normalized,
                    clinicPayoutIban,
                    clinicVippsMsn,
                    null
            );
        };
    }

    public String getApiBaseUrl() {
        return apiBaseUrl;
    }

    public String getClientId() {
        return clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public String getSubscriptionKey() {
        return subscriptionKey;
    }

    public String getTherapistPayoutIban() {
        return therapistPayoutIban;
    }

    public String getTherapistVippsMsn() {
        return therapistVippsMsn;
    }

    public String getManagementPayoutIban() {
        return managementPayoutIban;
    }

    public String getManagementVippsMsn() {
        return managementVippsMsn;
    }

    public boolean isRemoteEnabled() {
        return remoteEnabled;
    }

    public record PayoutRoute(
            String productType,
            String payoutIban,
            String vippsMsn,
            String grantedRole
    ) {}
}
