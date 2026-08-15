package com.willay.service;

import com.willay.dto.NotificacionDto;
import com.willay.entity.Notificacion;
import com.willay.repository.NotificacionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificacionService {

    private final NotificacionRepository notificacionRepository;

    @Transactional(readOnly = true)
    public List<NotificacionDto> listar(Long usuarioId) {
        return notificacionRepository.findTop30ByUsuarioIdOrderByCreadoEnDesc(usuarioId)
                .stream().map(this::aDto).toList();
    }

    @Transactional(readOnly = true)
    public long sinLeer(Long usuarioId) {
        return notificacionRepository.countByUsuarioIdAndLeidaEnIsNull(usuarioId);
    }

    @Transactional
    public void marcarTodasLeidas(Long usuarioId) {
        notificacionRepository.marcarTodasLeidas(usuarioId, OffsetDateTime.now());
    }

    private NotificacionDto aDto(Notificacion n) {
        return new NotificacionDto(n.getId(), n.getTipo(), n.getTitulo(),
                n.getCuerpo(), tiempoRelativo(n.getCreadoEn()), n.getLeidaEn() != null);
    }

    /** "hace 5 min", "hace 2 h", "ayer"… más legible que una marca horaria. */
    private String tiempoRelativo(OffsetDateTime momento) {
        if (momento == null) return "";
        Duration d = Duration.between(momento, OffsetDateTime.now());
        long min = d.toMinutes();
        if (min < 1) return "ahora";
        if (min < 60) return "hace " + min + " min";
        long horas = d.toHours();
        if (horas < 24) return "hace " + horas + " h";
        long dias = d.toDays();
        if (dias == 1) return "ayer";
        if (dias < 7) return "hace " + dias + " días";
        return momento.toLocalDate().toString();
    }
}
