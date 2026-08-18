package com.willay.service;

import com.willay.dto.ApoderadoDto;
import com.willay.entity.*;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ApoderadoService {

    private final ApoderadoRepository apoderadoRepository;
    private final AlumnoApoderadoRepository vinculoRepository;
    private final CodigoActivacionRepository codigoRepository;

    @Transactional(readOnly = true)
    public List<ApoderadoDto> listar(Long colegioId) {
        return apoderadoRepository.findByColegioIdOrderByApellidosAsc(colegioId).stream()
                .map(this::aDto)
                .toList();
    }

    private ApoderadoDto aDto(Apoderado ap) {
        List<ApoderadoDto.HijoResumen> hijos = new ArrayList<>();
        for (AlumnoApoderado v : vinculoRepository.findByApoderadoId(ap.getId())) {
            Alumno a = v.getAlumno();
            hijos.add(new ApoderadoDto.HijoResumen(a.getId(), a.getCodigo(), a.nombreCompleto(),
                    a.getAula() != null ? a.getAula().etiqueta() : "Sin aula", v.getParentesco()));
        }

        Usuario u = ap.getUsuario();
        String estado = u == null ? "SIN_CUENTA" : u.getEstado().name();
        // El código solo se muestra mientras la cuenta esté pendiente
        String codigo = (u != null && u.getEstado() == EstadoUsuario.PENDIENTE)
                ? codigoRepository.findByUsuarioIdAndUsadoEnIsNull(u.getId()).stream()
                    .findFirst().map(CodigoActivacion::getCodigo).orElse(null)
                : null;

        return new ApoderadoDto(ap.getId(), ap.getNombres(), ap.getApellidos(), ap.getDni(),
                ap.getTelefono(), ap.getCorreo(), estado, codigo, u != null ? u.getFotoUrl() : null, hijos);
    }
}
