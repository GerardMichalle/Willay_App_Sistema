package com.willay.config;

import com.willay.entity.EstadoUsuario;
import com.willay.entity.Rol;
import com.willay.entity.Usuario;
import com.willay.repository.UsuarioRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.ApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Crea la cuenta SUPER_ADMIN del proveedor en el primer arranque.
 *
 * Una instalación de producción nace con la base vacía, así que sin este
 * mecanismo nadie podría entrar nunca. Es el mismo patrón que usan Jenkins,
 * GitLab o SonarQube: credenciales iniciales por variables de entorno.
 *
 * Solo actúa si NO existe ningún usuario: es idempotente y nunca pisa datos.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class BootstrapRunner implements ApplicationRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${willay.bootstrap.habilitado:true}")   private boolean habilitado;
    @Value("${willay.bootstrap.correo:}")           private String correo;
    @Value("${willay.bootstrap.password:}")         private String password;
    @Value("${willay.bootstrap.nombres:Soporte}")   private String nombres;
    @Value("${willay.bootstrap.apellidos:Willay}")  private String apellidos;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        if (!habilitado) return;

        if (usuarioRepository.count() > 0) {
            log.debug("Bootstrap omitido: ya existen usuarios en la base");
            return;
        }
        if (correo.isBlank() || password.isBlank()) {
            log.warn("""
                    Base de datos vacía y sin credenciales de bootstrap.
                    Defina BOOTSTRAP_EMAIL y BOOTSTRAP_PASSWORD para crear \
                    la cuenta inicial del proveedor.""");
            return;
        }

        Usuario superAdmin = new Usuario();
        superAdmin.setColegio(null);                 // el proveedor no pertenece a un colegio
        superAdmin.setCorreo(correo.toLowerCase());
        superAdmin.setClaveHash(passwordEncoder.encode(password));
        superAdmin.setRol(Rol.SUPER_ADMIN);
        superAdmin.setNombres(nombres);
        superAdmin.setApellidos(apellidos);
        superAdmin.setEstado(EstadoUsuario.ACTIVO);
        usuarioRepository.save(superAdmin);

        log.info("Cuenta SUPER_ADMIN creada para {}. Cambie la contraseña tras el primer ingreso.", correo);
    }
}
