package com.appsmith.aiide.filter;

import jakarta.ws.rs.NameBinding;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Name-binding annotation for admin-only endpoints.
 * Apply to a JAX-RS resource class or method to enforce admin role check
 * via {@link AdminFilter}.
 */
@NameBinding
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface AdminOnly {
}
