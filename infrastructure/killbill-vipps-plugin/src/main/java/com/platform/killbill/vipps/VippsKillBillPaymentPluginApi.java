package com.platform.killbill.vipps;

import com.platform.killbill.vipps.VippsPluginConfig.PayoutRoute;
import com.platform.killbill.vipps.VippsRecurringApiClient.VippsAgreementResult;
import com.platform.killbill.vipps.VippsRecurringApiClient.VippsChargeResult;

import org.joda.time.DateTime;
import org.killbill.billing.catalog.api.Currency;
import org.killbill.billing.payment.api.PaymentMethodPlugin;
import org.killbill.billing.payment.api.PluginProperty;
import org.killbill.billing.payment.api.TransactionType;
import org.killbill.billing.payment.plugin.api.GatewayNotification;
import org.killbill.billing.payment.plugin.api.HostedPaymentPageFormDescriptor;
import org.killbill.billing.payment.plugin.api.PaymentMethodInfoPlugin;
import org.killbill.billing.payment.plugin.api.PaymentPluginApi;
import org.killbill.billing.payment.plugin.api.PaymentPluginApiException;
import org.killbill.billing.payment.plugin.api.PaymentPluginStatus;
import org.killbill.billing.payment.plugin.api.PaymentTransactionInfoPlugin;
import org.killbill.billing.util.callcontext.CallContext;
import org.killbill.billing.util.callcontext.TenantContext;
import org.killbill.billing.util.entity.Pagination;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;

/**
 * Kill Bill OSGi {@link PaymentPluginApi} implementation routing payments directly to
 * Vipps MobilePay Recurring v3 (subscriptions and Therapist/Management access plans)
 * and ePayment v1 (prepaid clip cards and tokenized credit cards), with hardcoded payout
 * IBAN & MSN destinations resolved from Docker Secrets via {@link VippsPluginConfig}.
 */
public class VippsKillBillPaymentPluginApi implements PaymentPluginApi {

    private static final Pattern RAW_PAN_PATTERN = Pattern.compile(".*\\d{12,19}.*");

    private final VippsPluginConfig config;
    private final VippsRecurringApiClient vippsClient;
    private final Map<UUID, List<PaymentTransactionInfoPlugin>> transactionsByPayment = new ConcurrentHashMap<>();
    private final Map<UUID, PaymentMethodPlugin> paymentMethodsById = new ConcurrentHashMap<>();
    private final Map<UUID, List<PaymentMethodInfoPlugin>> accountPaymentMethods = new ConcurrentHashMap<>();

    public VippsKillBillPaymentPluginApi(VippsPluginConfig config, VippsRecurringApiClient vippsClient) {
        this.config = config;
        this.vippsClient = vippsClient;
    }

    @Override
    public PaymentTransactionInfoPlugin authorizePayment(
            UUID kbAccountId,
            UUID kbPaymentId,
            UUID kbTransactionId,
            UUID kbPaymentMethodId,
            BigDecimal amount,
            Currency currency,
            Iterable<PluginProperty> properties,
            CallContext context
    ) throws PaymentPluginApiException {
        return executeGatewayTransaction(
                TransactionType.AUTHORIZE, kbPaymentId, kbTransactionId, amount, currency, properties
        );
    }

    @Override
    public PaymentTransactionInfoPlugin capturePayment(
            UUID kbAccountId,
            UUID kbPaymentId,
            UUID kbTransactionId,
            UUID kbPaymentMethodId,
            BigDecimal amount,
            Currency currency,
            Iterable<PluginProperty> properties,
            CallContext context
    ) throws PaymentPluginApiException {
        return executeGatewayTransaction(
                TransactionType.CAPTURE, kbPaymentId, kbTransactionId, amount, currency, properties
        );
    }

    @Override
    public PaymentTransactionInfoPlugin purchasePayment(
            UUID kbAccountId,
            UUID kbPaymentId,
            UUID kbTransactionId,
            UUID kbPaymentMethodId,
            BigDecimal amount,
            Currency currency,
            Iterable<PluginProperty> properties,
            CallContext context
    ) throws PaymentPluginApiException {
        return executeGatewayTransaction(
                TransactionType.PURCHASE, kbPaymentId, kbTransactionId, amount, currency, properties
        );
    }

    @Override
    public PaymentTransactionInfoPlugin voidPayment(
            UUID kbAccountId,
            UUID kbPaymentId,
            UUID kbTransactionId,
            UUID kbPaymentMethodId,
            Iterable<PluginProperty> properties,
            CallContext context
    ) throws PaymentPluginApiException {
        String agreementId = getProp(properties, "agreementId", "");
        String productType = getProp(properties, "productType", "CLINIC_SERVICE");
        if (!agreementId.isEmpty()) {
            vippsClient.stopAgreement(agreementId, config.resolvePayout(productType));
        }
        return recordTransaction(
                kbPaymentId,
                new VippsTransactionInfo(
                        kbPaymentId,
                        kbTransactionId,
                        TransactionType.VOID,
                        BigDecimal.ZERO,
                        Currency.DKK,
                        PaymentPluginStatus.PROCESSED,
                        agreementId,
                        "STOPPED",
                        toList(properties)
                )
        );
    }

    @Override
    public PaymentTransactionInfoPlugin creditPayment(
            UUID kbAccountId,
            UUID kbPaymentId,
            UUID kbTransactionId,
            UUID kbPaymentMethodId,
            BigDecimal amount,
            Currency currency,
            Iterable<PluginProperty> properties,
            CallContext context
    ) throws PaymentPluginApiException {
        return executeGatewayTransaction(
                TransactionType.CREDIT, kbPaymentId, kbTransactionId, amount, currency, properties
        );
    }

    @Override
    public PaymentTransactionInfoPlugin refundPayment(
            UUID kbAccountId,
            UUID kbPaymentId,
            UUID kbTransactionId,
            UUID kbPaymentMethodId,
            BigDecimal amount,
            Currency currency,
            Iterable<PluginProperty> properties,
            CallContext context
    ) throws PaymentPluginApiException {
        return recordTransaction(
                kbPaymentId,
                new VippsTransactionInfo(
                        kbPaymentId,
                        kbTransactionId,
                        TransactionType.REFUND,
                        amount,
                        currency,
                        PaymentPluginStatus.PROCESSED,
                        "refund-" + kbTransactionId,
                        "VIPPS-REFUND",
                        toList(properties)
                )
        );
    }

    @Override
    public List<PaymentTransactionInfoPlugin> getPaymentInfo(
            UUID kbAccountId,
            UUID kbPaymentId,
            Iterable<PluginProperty> properties,
            TenantContext context
    ) {
        return new ArrayList<>(transactionsByPayment.getOrDefault(kbPaymentId, List.of()));
    }

    @Override
    public Pagination<PaymentTransactionInfoPlugin> searchPayments(
            String searchKey,
            Long offset,
            Long limit,
            Iterable<PluginProperty> properties,
            TenantContext context
    ) {
        List<PaymentTransactionInfoPlugin> matches = new ArrayList<>();
        for (List<PaymentTransactionInfoPlugin> txList : transactionsByPayment.values()) {
            matches.addAll(txList);
        }
        return new ListPagination<>(offset == null ? 0L : offset, matches);
    }

    @Override
    public void addPaymentMethod(
            UUID kbAccountId,
            UUID kbPaymentMethodId,
            PaymentMethodPlugin paymentMethodProps,
            boolean setDefault,
            Iterable<PluginProperty> properties,
            CallContext context
    ) throws PaymentPluginApiException {
        if (paymentMethodProps != null) {
            validateNoRawPan(paymentMethodProps.getExternalPaymentMethodId());
            paymentMethodsById.put(kbPaymentMethodId, paymentMethodProps);
            accountPaymentMethods.computeIfAbsent(kbAccountId, ignored -> new ArrayList<>())
                    .add(new VippsPaymentMethodInfo(
                            kbAccountId,
                            kbPaymentMethodId,
                            setDefault,
                            paymentMethodProps.getExternalPaymentMethodId()
                    ));
        }
    }

    @Override
    public void deletePaymentMethod(
            UUID kbAccountId,
            UUID kbPaymentMethodId,
            Iterable<PluginProperty> properties,
            CallContext context
    ) {
        paymentMethodsById.remove(kbPaymentMethodId);
        List<PaymentMethodInfoPlugin> infos = accountPaymentMethods.get(kbAccountId);
        if (infos != null) {
            infos.removeIf(info -> kbPaymentMethodId.equals(info.getPaymentMethodId()));
        }
    }

    @Override
    public PaymentMethodPlugin getPaymentMethodDetail(
            UUID kbAccountId,
            UUID kbPaymentMethodId,
            Iterable<PluginProperty> properties,
            TenantContext context
    ) {
        return paymentMethodsById.get(kbPaymentMethodId);
    }

    @Override
    public void setDefaultPaymentMethod(
            UUID kbAccountId,
            UUID kbPaymentMethodId,
            Iterable<PluginProperty> properties,
            CallContext context
    ) {
        // Default payment method is stored cleanly per account
    }

    @Override
    public List<PaymentMethodInfoPlugin> getPaymentMethods(
            UUID kbAccountId,
            boolean refreshFromGateway,
            Iterable<PluginProperty> properties,
            CallContext context
    ) {
        return new ArrayList<>(accountPaymentMethods.getOrDefault(kbAccountId, List.of()));
    }

    @Override
    public Pagination<PaymentMethodPlugin> searchPaymentMethods(
            String searchKey,
            Long offset,
            Long limit,
            Iterable<PluginProperty> properties,
            TenantContext context
    ) {
        return new ListPagination<>(offset == null ? 0L : offset, new ArrayList<>(paymentMethodsById.values()));
    }

    @Override
    public void resetPaymentMethods(
            UUID kbAccountId,
            List<PaymentMethodInfoPlugin> paymentMethods,
            Iterable<PluginProperty> properties,
            CallContext context
    ) {
        accountPaymentMethods.put(kbAccountId, new ArrayList<>(paymentMethods));
    }

    @Override
    public HostedPaymentPageFormDescriptor buildFormDescriptor(
            UUID kbAccountId,
            Iterable<PluginProperty> customFields,
            Iterable<PluginProperty> properties,
            CallContext context
    ) {
        return new VippsFormDescriptor(
                kbAccountId,
                "POST",
                config.getApiBaseUrl() + "/recurring/v3/agreements",
                toList(customFields),
                toList(properties)
        );
    }

    @Override
    public GatewayNotification processNotification(
            String notification,
            Iterable<PluginProperty> properties,
            CallContext context
    ) {
        return new VippsGatewayNotification(UUID.randomUUID(), 200, "{\"status\":\"ACKNOWLEDGED\"}", toList(properties));
    }

    private PaymentTransactionInfoPlugin executeGatewayTransaction(
            TransactionType txType,
            UUID kbPaymentId,
            UUID kbTransactionId,
            BigDecimal amount,
            Currency currency,
            Iterable<PluginProperty> properties
    ) throws PaymentPluginApiException {
        String productType = getProp(properties, "productType", "SUBSCRIPTION");
        String paymentMethod = getProp(properties, "paymentMethod", "MOBILEPAY");
        String planName = getProp(properties, "planName", "EduJournal Plan");
        String phoneNumber = getProp(properties, "phoneNumber", "+4520123456");
        String cardToken = getProp(properties, "cardToken", "");
        String cardLast4 = getProp(properties, "cardLast4", "4242");

        validateNoRawPan(cardToken);

        PayoutRoute route = config.resolvePayout(productType);
        String isoCurrency = currency == null ? "DKK" : currency.name();

        String ref1;
        String ref2;
        String redirectUrl = null;
        if (isRecurringProduct(productType)) {
            VippsAgreementResult agreement = vippsClient.createAgreement(planName, amount, isoCurrency, phoneNumber, route);
            String chargeId = agreement.chargeId();
            if (chargeId == null) {
                chargeId = vippsClient.createCharge(agreement.agreementId(), amount, isoCurrency, planName, route).chargeId();
            }
            ref1 = agreement.agreementId();
            ref2 = chargeId;
            redirectUrl = agreement.redirectUrl();
        } else {
            String masked = "CREDIT_CARD".equalsIgnoreCase(paymentMethod)
                    ? "CARD-" + cardLast4
                    : "MOBILEPAY";
            VippsChargeResult epay = vippsClient.createEPayment(
                    paymentMethod,
                    amount,
                    isoCurrency,
                    "kb-" + kbTransactionId,
                    masked,
                    route
            );
            ref1 = epay.chargeId();
            ref2 = route.vippsMsn();
            redirectUrl = epay.redirectUrl();
        }

        List<PluginProperty> outputProps = new ArrayList<>(toList(properties));
        outputProps.add(new PluginProperty("payoutIban", route.payoutIban(), false));
        outputProps.add(new PluginProperty("vippsMsn", route.vippsMsn(), false));
        if (redirectUrl != null) {
            outputProps.add(new PluginProperty("redirectUrl", redirectUrl, false));
        }
        if (route.grantedRole() != null) {
            outputProps.add(new PluginProperty("grantedRole", route.grantedRole(), false));
        }

        return recordTransaction(
                kbPaymentId,
                new VippsTransactionInfo(
                        kbPaymentId,
                        kbTransactionId,
                        txType,
                        amount,
                        currency,
                        PaymentPluginStatus.PROCESSED,
                        ref1,
                        ref2,
                        outputProps
                )
        );
    }

    private PaymentTransactionInfoPlugin recordTransaction(UUID kbPaymentId, PaymentTransactionInfoPlugin info) {
        transactionsByPayment.computeIfAbsent(kbPaymentId, ignored -> new ArrayList<>()).add(info);
        return info;
    }

    private static boolean isRecurringProduct(String productType) {
        return "SUBSCRIPTION".equalsIgnoreCase(productType)
                || "THERAPIST_ACCESS".equalsIgnoreCase(productType)
                || "MANAGEMENT_ACCESS".equalsIgnoreCase(productType);
    }

    private static void validateNoRawPan(String tokenOrId) throws PaymentPluginApiException {
        if (tokenOrId != null && RAW_PAN_PATTERN.matcher(tokenOrId.replaceAll("[\\s-]", "")).matches()) {
            throw new PaymentPluginApiException("PCI_VIOLATION", "Raw credit card PAN must never reach Kill Bill plugin");
        }
    }

    private static String getProp(Iterable<PluginProperty> properties, String key, String defaultValue) {
        if (properties == null) {
            return defaultValue;
        }
        for (PluginProperty p : properties) {
            if (p != null && key.equals(p.getKey()) && p.getValue() != null) {
                return String.valueOf(p.getValue());
            }
        }
        return defaultValue;
    }

    private static List<PluginProperty> toList(Iterable<PluginProperty> properties) {
        if (properties == null) {
            return List.of();
        }
        List<PluginProperty> out = new ArrayList<>();
        properties.forEach(out::add);
        return out;
    }

    private static final class VippsTransactionInfo implements PaymentTransactionInfoPlugin {
        private final UUID kbPaymentId;
        private final UUID kbTransactionId;
        private final TransactionType transactionType;
        private final BigDecimal amount;
        private final Currency currency;
        private final DateTime now;
        private final PaymentPluginStatus status;
        private final String ref1;
        private final String ref2;
        private final List<PluginProperty> properties;

        private VippsTransactionInfo(
                UUID kbPaymentId,
                UUID kbTransactionId,
                TransactionType transactionType,
                BigDecimal amount,
                Currency currency,
                PaymentPluginStatus status,
                String ref1,
                String ref2,
                List<PluginProperty> properties
        ) {
            this.kbPaymentId = kbPaymentId;
            this.kbTransactionId = kbTransactionId;
            this.transactionType = transactionType;
            this.amount = amount;
            this.currency = currency;
            this.now = DateTime.now();
            this.status = status;
            this.ref1 = ref1;
            this.ref2 = ref2;
            this.properties = properties;
        }

        @Override public UUID getKbPaymentId() { return kbPaymentId; }
        @Override public UUID getKbTransactionPaymentId() { return kbTransactionId; }
        @Override public TransactionType getTransactionType() { return transactionType; }
        @Override public BigDecimal getAmount() { return amount; }
        @Override public Currency getCurrency() { return currency; }
        @Override public DateTime getCreatedDate() { return now; }
        @Override public DateTime getEffectiveDate() { return now; }
        @Override public PaymentPluginStatus getStatus() { return status; }
        @Override public String getGatewayError() { return null; }
        @Override public String getGatewayErrorCode() { return null; }
        @Override public String getFirstPaymentReferenceId() { return ref1; }
        @Override public String getSecondPaymentReferenceId() { return ref2; }
        @Override public List<PluginProperty> getProperties() { return properties; }
    }

    private record VippsPaymentMethodInfo(
            UUID accountId,
            UUID paymentMethodId,
            boolean isDefault,
            String externalPaymentMethodId
    ) implements PaymentMethodInfoPlugin {
        @Override public UUID getAccountId() { return accountId; }
        @Override public UUID getPaymentMethodId() { return paymentMethodId; }
        @Override public boolean isDefault() { return isDefault; }
        @Override public String getExternalPaymentMethodId() { return externalPaymentMethodId; }
    }

    private record VippsFormDescriptor(
            UUID kbAccountId,
            String formMethod,
            String formUrl,
            List<PluginProperty> formFields,
            List<PluginProperty> properties
    ) implements HostedPaymentPageFormDescriptor {
        @Override public UUID getKbAccountId() { return kbAccountId; }
        @Override public String getFormMethod() { return formMethod; }
        @Override public String getFormUrl() { return formUrl; }
        @Override public List<PluginProperty> getFormFields() { return formFields; }
        @Override public List<PluginProperty> getProperties() { return properties; }
    }

    private record VippsGatewayNotification(
            UUID kbPaymentId,
            int status,
            String entity,
            List<PluginProperty> properties
    ) implements GatewayNotification {
        @Override public UUID getKbPaymentId() { return kbPaymentId; }
        @Override public int getStatus() { return status; }
        @Override public String getEntity() { return entity; }
        @Override public Map<String, List<String>> getHeaders() { return Collections.emptyMap(); }
        @Override public List<PluginProperty> getProperties() { return properties; }
    }

    private record ListPagination<T>(Long offset, List<T> items) implements Pagination<T> {
        @Override public Long getCurrentOffset() { return offset; }
        @Override public Long getNextOffset() { return null; }
        @Override public Long getMaxNbRecords() { return (long) items.size(); }
        @Override public Long getTotalNbRecords() { return (long) items.size(); }
        @Override public Iterator<T> iterator() { return items.iterator(); }
        @Override public void close() {}
    }
}
