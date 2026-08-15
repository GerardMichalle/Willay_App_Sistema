package com.willay.mapper;

import com.willay.dto.UsuarioDto;
import com.willay.entity.Usuario;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

@Mapper(componentModel = "spring")
public interface UsuarioMapper {

    /** colegio es nulo para SUPER_ADMIN: MapStruct navega con seguridad. */
    @Mapping(target = "rol", expression = "java(usuario.getRol().name())")
    @Mapping(target = "colegioId", source = "colegio.id")
    @Mapping(target = "colegioNombre", source = "colegio.nombre")
    UsuarioDto aDto(Usuario usuario);
}
