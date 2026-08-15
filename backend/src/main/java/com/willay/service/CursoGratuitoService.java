package com.willay.service;

import com.willay.dto.*;
import com.willay.entity.CategoriaCurso;
import com.willay.entity.CursoGratuito;
import com.willay.entity.RecursoCurso;
import com.willay.exception.NotFoundException;
import com.willay.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Catálogo de cursos gratuitos.
 *
 * El contenido pertenece al proveedor de la plataforma, no a las
 * instituciones: se publica una vez y queda disponible para todos los
 * colegios. Únicamente el rol SUPER_ADMIN puede modificarlo; los demás
 * roles lo consultan.
 */
@Service
@RequiredArgsConstructor
public class CursoGratuitoService {

    private final CursoGratuitoRepository cursoRepository;
    private final CategoriaCursoRepository categoriaRepository;
    private final RecursoCursoRepository recursoRepository;

    // ── Consulta ─────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<CursoGratuitoDto> catalogo(Long colegioId) {
        List<CursoGratuito> cursos = colegioId == null
                ? cursoRepository.findByActivoTrueOrderByOrdenAscIdAsc()
                : cursoRepository.catalogoPara(colegioId);
        return cursos.stream().map(this::aDto).toList();
    }

    // ── Cursos ───────────────────────────────────────────────────────

    @Transactional
    public CursoGratuitoDto crearCurso(GuardarCursoRequest req) {
        CursoGratuito c = new CursoGratuito();
        c.setColegio(null);              // catálogo global
        aplicar(c, req);
        cursoRepository.save(c);
        return aDto(c);
    }

    @Transactional
    public CursoGratuitoDto actualizarCurso(Long id, GuardarCursoRequest req) {
        CursoGratuito c = buscarCurso(id);
        aplicar(c, req);
        return aDto(c);
    }

    /** Baja lógica: el curso desaparece del catálogo sin perder su material. */
    @Transactional
    public void eliminarCurso(Long id) {
        buscarCurso(id).setActivo(false);
    }

    // ── Módulos ──────────────────────────────────────────────────────

    @Transactional
    public CursoGratuitoDto crearCategoria(Long cursoId, GuardarCategoriaRequest req) {
        CursoGratuito curso = buscarCurso(cursoId);
        CategoriaCurso cat = new CategoriaCurso();
        cat.setCurso(curso);
        cat.setNombre(req.nombre().trim());
        cat.setOrden((short) req.orden());
        categoriaRepository.save(cat);
        return aDto(curso);
    }

    @Transactional
    public CursoGratuitoDto actualizarCategoria(Long cursoId, Long categoriaId, GuardarCategoriaRequest req) {
        CategoriaCurso cat = categoriaRepository.findByIdAndCursoId(categoriaId, cursoId)
                .orElseThrow(() -> new NotFoundException("Módulo no encontrado"));
        cat.setNombre(req.nombre().trim());
        cat.setOrden((short) req.orden());
        return aDto(cat.getCurso());
    }

    @Transactional
    public void eliminarCategoria(Long cursoId, Long categoriaId) {
        CategoriaCurso cat = categoriaRepository.findByIdAndCursoId(categoriaId, cursoId)
                .orElseThrow(() -> new NotFoundException("Módulo no encontrado"));
        categoriaRepository.delete(cat);
    }

    // ── Recursos ─────────────────────────────────────────────────────

    @Transactional
    public CursoGratuitoDto agregarRecurso(Long cursoId, Long categoriaId, GuardarRecursoRequest req) {
        CategoriaCurso cat = categoriaRepository.findByIdAndCursoId(categoriaId, cursoId)
                .orElseThrow(() -> new NotFoundException("Módulo no encontrado"));

        RecursoCurso r = new RecursoCurso();
        r.setCategoria(cat);
        aplicar(r, req);
        recursoRepository.save(r);
        return aDto(cat.getCurso());
    }

    @Transactional
    public CursoGratuitoDto actualizarRecurso(Long cursoId, Long recursoId, GuardarRecursoRequest req) {
        RecursoCurso r = recursoRepository.findById(recursoId)
                .filter(x -> x.getCategoria().getCurso().getId().equals(cursoId))
                .orElseThrow(() -> new NotFoundException("Recurso no encontrado"));
        aplicar(r, req);
        return aDto(r.getCategoria().getCurso());
    }

    @Transactional
    public void eliminarRecurso(Long cursoId, Long recursoId) {
        RecursoCurso r = recursoRepository.findById(recursoId)
                .filter(x -> x.getCategoria().getCurso().getId().equals(cursoId))
                .orElseThrow(() -> new NotFoundException("Recurso no encontrado"));
        recursoRepository.delete(r);
    }

    // ── Apoyo ────────────────────────────────────────────────────────

    private CursoGratuito buscarCurso(Long id) {
        return cursoRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Curso no encontrado"));
    }

    private void aplicar(CursoGratuito c, GuardarCursoRequest req) {
        c.setTitulo(req.titulo().trim());
        c.setDescripcion(req.descripcion());
        c.setPortadaUrl(req.portadaUrl());
        c.setOrden((short) req.orden());
        c.setActivo(true);
    }

    private void aplicar(RecursoCurso r, GuardarRecursoRequest req) {
        r.setTitulo(req.titulo().trim());
        r.setTipo(req.tipo());
        r.setUrlArchivo(req.urlArchivo());
        r.setTamanoBytes(req.tamanoBytes());
        r.setDuracionSeg(req.duracionSeg());
        r.setOrden((short) req.orden());
    }

    private CursoGratuitoDto aDto(CursoGratuito c) {
        List<CursoGratuitoDto.CategoriaDto> categorias =
                categoriaRepository.findByCursoIdOrderByOrdenAsc(c.getId()).stream()
                        .map(cat -> new CursoGratuitoDto.CategoriaDto(
                                cat.getId(), cat.getNombre(), cat.getOrden(),
                                recursoRepository.findByCategoriaIdOrderByOrdenAsc(cat.getId()).stream()
                                        .map(this::aDto).toList()))
                        .toList();

        long recursos = categorias.stream().mapToLong(cat -> cat.recursos().size()).sum();
        return new CursoGratuitoDto(c.getId(), c.getTitulo(), c.getDescripcion(), c.getPortadaUrl(),
                c.getColegio() == null, c.getOrden(), recursos, categorias);
    }

    private CursoGratuitoDto.RecursoDto aDto(RecursoCurso r) {
        return new CursoGratuitoDto.RecursoDto(
                r.getId(), r.getTitulo(), r.getTipo(), r.getUrlArchivo(),
                formatearTamano(r.getTamanoBytes()), formatearDuracion(r.getDuracionSeg()), r.getOrden());
    }

    private String formatearTamano(Long bytes) {
        if (bytes == null || bytes <= 0) return null;
        double mb = bytes / 1024.0 / 1024.0;
        return mb >= 1 ? String.format("%.1f MB", mb) : String.format("%.0f KB", bytes / 1024.0);
    }

    private String formatearDuracion(Integer segundos) {
        if (segundos == null || segundos <= 0) return null;
        return String.format("%d:%02d", segundos / 60, segundos % 60);
    }
}