package com.willay.service;

import com.willay.entity.CodigoActivacion;
import com.willay.entity.Usuario;
import com.willay.repository.CodigoActivacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.OffsetDateTime;

/**
 * Emisión de códigos de activación.
 *
 * El código es de 6 dígitos, único por colegio y de un solo uso. Se genera
 * con SecureRandom (no Random) porque es una credencial: un generador
 * predecible permitiría adivinar códigos de otras familias.
 */
@Service
@RequiredArgsConstructor
public class CodigoActivacionService {

    private static final SecureRandom ALEATORIO = new SecureRandom();
    private static final int INTENTOS_MAX = 50;

    private final CodigoActivacionRepository codigoRepository;

    @Value("${willay.activacion.dias-vigencia:60}")
    private int diasVigencia;

    /** Crea (o renueva) el código de activación de un usuario. */
    @Transactional
    public CodigoActivacion emitir(Usuario usuario, String dni) {
        Long colegioId = usuario.getColegio().getId();

        // Invalida cualquier código previo no usado: solo uno vigente por persona
        codigoRepository.findByUsuarioIdAndUsadoEnIsNull(usuario.getId())
                .forEach(c -> c.setUsadoEn(OffsetDateTime.now()));

        CodigoActivacion codigo = new CodigoActivacion();
        codigo.setColegioId(colegioId);
        codigo.setUsuario(usuario);
        codigo.setCodigo(generarUnico(colegioId));
        codigo.setDni(dni);
        codigo.setExpiraEn(OffsetDateTime.now().plusDays(diasVigencia));
        return codigoRepository.save(codigo);
    }

    private String generarUnico(Long colegioId) {
        for (int i = 0; i < INTENTOS_MAX; i++) {
            String candidato = String.format("%06d", ALEATORIO.nextInt(1_000_000));
            if (!codigoRepository.existsByColegioIdAndCodigoAndUsadoEnIsNull(colegioId, candidato)) {
                return candidato;
            }
        }
        throw new IllegalStateException("No se pudo generar un código de activación único");
    }
}
