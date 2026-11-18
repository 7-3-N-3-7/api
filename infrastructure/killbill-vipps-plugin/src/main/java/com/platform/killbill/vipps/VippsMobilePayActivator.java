package com.platform.killbill.vipps;

import org.killbill.billing.payment.plugin.api.PaymentPluginApi;
import org.osgi.framework.BundleActivator;
import org.osgi.framework.BundleContext;
import org.osgi.framework.ServiceRegistration;

import java.util.Hashtable;

/**
 * OSGi {@link BundleActivator} registering {@link VippsKillBillPaymentPluginApi} into
 * Kill Bill's Apache Felix / OSGi service registry under plugin name {@code killbill-vipps-mobilepay}.
 */
public class VippsMobilePayActivator implements BundleActivator {

    public static final String PLUGIN_NAME = "killbill-vipps-mobilepay";

    private ServiceRegistration<PaymentPluginApi> registration;

    @Override
    public void start(BundleContext context) {
        VippsPluginConfig config = new VippsPluginConfig();
        VippsRecurringApiClient apiClient = new VippsRecurringApiClient(config);
        PaymentPluginApi pluginApi = new VippsKillBillPaymentPluginApi(config, apiClient);

        Hashtable<String, String> props = new Hashtable<>();
        props.put("killbill.pluginName", PLUGIN_NAME);
        props.put("org.killbill.billing.osgi.plugin.name", PLUGIN_NAME);

        registration = context.registerService(PaymentPluginApi.class, pluginApi, props);
    }

    @Override
    public void stop(BundleContext context) {
        if (registration != null) {
            registration.unregister();
            registration = null;
        }
    }
}
