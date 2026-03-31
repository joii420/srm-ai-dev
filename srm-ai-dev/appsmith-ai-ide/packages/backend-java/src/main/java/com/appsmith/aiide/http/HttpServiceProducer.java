package com.appsmith.aiide.http;

import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import jakarta.inject.Singleton;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.jboss.logging.Logger;

/**
 * CDI producer that creates the appropriate IHttpService implementation
 * based on configuration property aiide.http-service-type.
 *
 * Values:
 *   httpclient - uses java.net.http.HttpClient (default)
 *   httputil   - uses java.net.HttpURLConnection
 */
@ApplicationScoped
public class HttpServiceProducer {

    private static final Logger LOG = Logger.getLogger(HttpServiceProducer.class);

    @ConfigProperty(name = "aiide.http-service-type", defaultValue = "httpclient")
    String httpServiceType;

    @Produces
    @Singleton
    public IHttpService produceHttpService() {
        if ("httputil".equalsIgnoreCase(httpServiceType)) {
            LOG.info("Using HttpUtil (HttpURLConnection) as HTTP service");
            return new HttpUtil();
        }
        LOG.info("Using HttpClientUtil (java.net.http.HttpClient) as HTTP service");
        return new HttpClientUtil();
    }
}
