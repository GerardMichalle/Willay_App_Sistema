package com.willay.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity            // habilita @PreAuthorize en controladores
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())                       // API stateless con JWT
            // Conecta el CorsConfigurationSource de CorsConfig con la cadena de
            // Security — sin esto, Security rechaza el preflight OPTIONS de
            // cualquier endpoint autenticado antes de que el CORS real se aplique.
            .cors(Customizer.withDefaults())
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(e -> e.authenticationEntryPoint(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
            .authorizeHttpRequests(auth -> auth
                // El preflight del navegador nunca lleva el header Authorization
                // todavía — debe pasar siempre, sea cual sea el endpoint real.
                .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                // Cambiar la propia contraseña exige sesión real, a diferencia
                // del resto de /api/auth/** (login/refresh son públicos por diseño).
                .requestMatchers(HttpMethod.PUT, "/api/auth/password").authenticated()
                // Públicos: login/refresh, activación de cuentas, docs y salud
                .requestMatchers("/api/auth/**", "/api/activacion/**", "/api/asistencia/lectura").permitAll()
                .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/v3/api-docs/**").permitAll()
                .requestMatchers("/actuator/health").permitAll()
                // Descarga de archivos: sin sesión también, para aceptar el enlace
                // firmado (?token=…); el control de acceso real ocurre en el
                // controlador, no aquí (ver ArchivoController.descargar()).
                .requestMatchers(HttpMethod.GET, "/api/archivos/*").permitAll()
                // Todo lo demás requiere token
                .anyRequest().authenticated())
            .headers(headers -> headers
                    .contentTypeOptions(Customizer.withDefaults())      // X-Content-Type-Options: nosniff
                    .frameOptions(frame -> frame.deny())                 // X-Frame-Options: DENY
                    .httpStrictTransportSecurity(hsts -> hsts
                            .includeSubDomains(true)
                            .maxAgeInSeconds(31536000))                   // HSTS: fuerza HTTPS por un año
            )
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
