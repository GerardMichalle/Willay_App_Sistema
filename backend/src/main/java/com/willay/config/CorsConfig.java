package com.willay.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * CORS para desarrollo local: el frontend (Vite) corre en el puerto 5173.
 * En producción los orígenes se definen por variable de entorno.
 *
 * Expuesto como CorsConfigurationSource (no como WebMvcConfigurer): Spring
 * Security procesa cada petición ANTES que el despachador de Spring MVC, y
 * un WebMvcConfigurer.addCorsMappings() nunca llega a aplicarse a una
 * petición que Security ya rechazó — por ejemplo, el preflight OPTIONS de
 * un endpoint autenticado, que por definición no lleva el header
 * Authorization todavía. SecurityConfig.filterChain() conecta este bean
 * con .cors(...) para que Security lo aplique antes de sus propias reglas
 * de autorización.
 */
@Configuration
public class CorsConfig {

    @Value("${willay.cors.origenes:http://localhost:5173}")
    private String[] origenes;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuracion = new CorsConfiguration();
        configuracion.setAllowedOrigins(List.of(origenes));
        configuracion.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuracion.setAllowedHeaders(List.of("*"));

        UrlBasedCorsConfigurationSource fuente = new UrlBasedCorsConfigurationSource();
        fuente.registerCorsConfiguration("/api/**", configuracion);
        // El panel de salud del superadmin (getSaludSistema()) consulta esta
        // ruta directo desde el navegador: sin registrarla aquí también,
        // /actuator/health queda pública pero sin cabeceras CORS, y el
        // fetch() falla igual que le pasaba a /api/** antes de este archivo.
        fuente.registerCorsConfiguration("/actuator/**", configuracion);
        return fuente;
    }
}
