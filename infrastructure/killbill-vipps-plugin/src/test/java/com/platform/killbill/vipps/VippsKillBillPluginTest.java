package com.platform.killbill.vipps;

import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.killbill.billing.catalog.api.Currency;
import org.killbill.billing.payment.api.PaymentMethodPlugin;
import org.killbill.billing.payment.api.PluginProperty;
import org.killbill.billing.payment.api.TransactionType;
import org.killbill.billing.payment.plugin.api.PaymentPluginApi;
import org.killbill.billing.payment.plugin.api.PaymentPluginApiException;
import org.killbill.billing.payment.plugin.api.PaymentPluginStatus;
import org.killbill.billing.payment.plugin.api.PaymentTransactionInfoPlugin;
import org.killbill.billing.util.callcontext.CallContext;
import org.osgi.framework.BundleContext;
import org.osgi.framework.ServiceRegistration;

import java.io.OutputStream;
import java.math.BigDecimal;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Dictionary;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class VippsKillBillPluginTest {

    private HttpServer mockVippsServer;
    private final List<String> capturedRequests = new ArrayList<>();
    private final AtomicInteger forcedHttpStatus = new AtomicInteger(200);

    @BeforeEach
    void setUp() throws Exception {
        capturedRequests.clear();
        forcedHttpStatus.set(200);
        mockVippsServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        mockVippsServer.createContext("/", exchange -> {
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();
            String msn = exchange.getRequestHeaders().getFirst("Merchant-Serial-Number");
            capturedRequests.add(method + " " + path + " MSN=" + msn);

            int code = forcedHttpStatus.get();
            String json = switch (path) {
                case "/accesstoken/get" -> "{\"access_token\":\"vipps-live-jwt-123\"}";
                case "/recurring/v3/agreements" -> "{\"agreementId\":\"agr_live_001\"}";
                case "/epayment/v1/payments" -> "{\"reference\":\"epay_live_001\"}";
                default -> path.endsWith("/charges")
                        ? "{\"chargeId\":\"chg_live_001\"}"
                        : "{\"status\":\"OK\"}";
            };
            byte[] bytes = json.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().add("Content-Type", "application/json");
            exchange.sendResponseHeaders(code, bytes.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(bytes);
            }
        });
        mockVippsServer.start();
    }

    @AfterEach
    void tearDown() {
        if (mockVippsServer != null) {
            mockVippsServer.stop(0);
        }
    }

    @Test
    void testDockerSecretsConfigAndRolePayoutRouting(@TempDir Path secretsDir) throws Exception {
        Files.writeString(secretsDir.resolve("vipps_therapist_payout_iban"), "DK1111111111111111\n");
        Files.writeString(secretsDir.resolve("vipps_therapist_vipps_msn"), "910101");
        Files.writeString(secretsDir.resolve("vipps_management_payout_iban"), "DK2222222222222222");
        Files.writeString(secretsDir.resolve("vipps_management_vipps_msn"), "920202");

        VippsPluginConfig config = new VippsPluginConfig(secretsDir, false);
        assertEquals("DK1111111111111111", config.getTherapistPayoutIban());
        assertEquals("910101", config.getTherapistVippsMsn());
        assertEquals("DK2222222222222222", config.getManagementPayoutIban());
        assertEquals("920202", config.getManagementVippsMsn());

        var therapistRoute = config.resolvePayout("THERAPIST_ACCESS");
        assertEquals("DK1111111111111111", therapistRoute.payoutIban());
        assertEquals("THERAPIST", therapistRoute.grantedRole());

        var mgmtRoute = config.resolvePayout("MANAGEMENT_ACCESS");
        assertEquals("DK2222222222222222", mgmtRoute.payoutIban());
        assertEquals("ADMIN", mgmtRoute.grantedRole());

        var defaultRoute = config.resolvePayout("CLIP_CARD");
        assertEquals(VippsPluginConfig.DEFAULT_CLINIC_IBAN, defaultRoute.payoutIban());
        assertNull(defaultRoute.grantedRole());
    }

    @Test
    void testOsgiBundleActivatorRegistersAndStopsService() {
        BundleContext bundleContext = mock(BundleContext.class);
        @SuppressWarnings("unchecked")
        ServiceRegistration<PaymentPluginApi> registration = mock(ServiceRegistration.class);
        when(bundleContext.registerService(eq(PaymentPluginApi.class), any(PaymentPluginApi.class), any(Dictionary.class)))
                .thenReturn(registration);

        VippsMobilePayActivator activator = new VippsMobilePayActivator();
        activator.start(bundleContext);
        verify(bundleContext).registerService(eq(PaymentPluginApi.class), any(VippsKillBillPaymentPluginApi.class), any(Dictionary.class));

        activator.stop(bundleContext);
        verify(registration).unregister();
        activator.stop(bundleContext);
    }

    @Test
    void testDirectVippsRecurringAndEPaymentFlowsWithMockServer() throws Exception {
        String baseUrl = "http://127.0.0.1:" + mockVippsServer.getAddress().getPort();
        VippsPluginConfig config = new VippsPluginConfig(
                baseUrl, "cid", "csec", "subk",
                "DK8130000012345678", "700101",
                "DK9230000087654321", "700202",
                true
        );
        VippsKillBillPaymentPluginApi plugin = new VippsKillBillPaymentPluginApi(config, new VippsRecurringApiClient(config));

        UUID accountId = UUID.randomUUID();
        UUID pmId = UUID.randomUUID();
        CallContext ctx = mock(CallContext.class);

        // 1. Therapist Access via Vipps MobilePay Recurring v3
        UUID therapistPayId = UUID.randomUUID();
        PaymentTransactionInfoPlugin therapistTx = plugin.purchasePayment(
                accountId,
                therapistPayId,
                UUID.randomUUID(),
                pmId,
                new BigDecimal("799.00"),
                Currency.DKK,
                List.of(
                        new PluginProperty("productType", "THERAPIST_ACCESS", false),
                        new PluginProperty("paymentMethod", "MOBILEPAY", false),
                        new PluginProperty("planName", "Therapist-adgang", false),
                        new PluginProperty("phoneNumber", "+4520123456", false)
                ),
                ctx
        );
        assertEquals(PaymentPluginStatus.PROCESSED, therapistTx.getStatus());
        assertEquals(TransactionType.PURCHASE, therapistTx.getTransactionType());
        assertEquals("agr_live_001", therapistTx.getFirstPaymentReferenceId());
        assertEquals("chg_live_001", therapistTx.getSecondPaymentReferenceId());
        assertTrue(capturedRequests.stream().anyMatch(r -> r.contains("/recurring/v3/agreements") && r.contains("MSN=700101")));

        // 2. Clip card via Tokenized Credit Card (ePayment v1 CARD)
        PaymentTransactionInfoPlugin cardTx = plugin.purchasePayment(
                accountId,
                UUID.randomUUID(),
                UUID.randomUUID(),
                pmId,
                new BigDecimal("5000.00"),
                Currency.DKK,
                List.of(
                        new PluginProperty("productType", "CLIP_CARD", false),
                        new PluginProperty("paymentMethod", "CREDIT_CARD", false),
                        new PluginProperty("cardToken", "tok_card_sandbox_abc", false),
                        new PluginProperty("cardLast4", "4242", false)
                ),
                ctx
        );
        assertEquals(PaymentPluginStatus.PROCESSED, cardTx.getStatus());
        assertTrue(capturedRequests.stream().anyMatch(r -> r.contains("/epayment/v1/payments") && r.contains("MSN=700000")));

        // 3. PCI Raw PAN rejection guard
        assertThrows(PaymentPluginApiException.class, () ->
                plugin.purchasePayment(
                        accountId,
                        UUID.randomUUID(),
                        UUID.randomUUID(),
                        pmId,
                        new BigDecimal("499.00"),
                        Currency.DKK,
                        List.of(
                                new PluginProperty("paymentMethod", "CREDIT_CARD", false),
                                new PluginProperty("cardToken", "4532015112830366", false)
                        ),
                        ctx
                )
        );

        // 4. Void agreement, Refund, PaymentMethod lifecycle & Search
        PaymentTransactionInfoPlugin voidTx = plugin.voidPayment(
                accountId,
                therapistPayId,
                UUID.randomUUID(),
                pmId,
                List.of(
                        new PluginProperty("agreementId", "agr_live_001", false),
                        new PluginProperty("productType", "THERAPIST_ACCESS", false)
                ),
                ctx
        );
        assertEquals(PaymentPluginStatus.PROCESSED, voidTx.getStatus());
        assertTrue(capturedRequests.stream().anyMatch(r -> r.startsWith("PATCH /recurring/v3/agreements/agr_live_001")));

        PaymentTransactionInfoPlugin refundTx = plugin.refundPayment(
                accountId, therapistPayId, UUID.randomUUID(), pmId, new BigDecimal("799.00"), Currency.DKK, List.of(), ctx
        );
        assertEquals(TransactionType.REFUND, refundTx.getTransactionType());
        assertEquals(3, plugin.getPaymentInfo(accountId, therapistPayId, List.of(), ctx).size());
        assertNotNull(plugin.searchPayments("agr", 0L, 10L, List.of(), ctx).iterator().next());

        PaymentMethodPlugin pm = mock(PaymentMethodPlugin.class);
        when(pm.getExternalPaymentMethodId()).thenReturn("tok_vipps_method_1");
        plugin.addPaymentMethod(accountId, pmId, pm, true, List.of(), ctx);
        assertEquals(1, plugin.getPaymentMethods(accountId, false, List.of(), ctx).size());
        assertSame(pm, plugin.getPaymentMethodDetail(accountId, pmId, List.of(), ctx));
        assertNotNull(plugin.buildFormDescriptor(accountId, List.of(), List.of(), ctx).getFormUrl());
        assertEquals(200, plugin.processNotification("{}", List.of(), ctx).getStatus());
        plugin.deletePaymentMethod(accountId, pmId, List.of(), ctx);
        assertTrue(plugin.getPaymentMethods(accountId, false, List.of(), ctx).isEmpty());
    }
}
