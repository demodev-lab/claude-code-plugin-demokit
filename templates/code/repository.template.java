package {{basePackage}}.domain.{{domainNameLower}}.repository;

import {{basePackage}}.domain.{{domainNameLower}}.entity.{{EntityName}};
import {{basePackage}}.domain.{{domainNameLower}}.exception.{{EntityName}}NotFoundException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface {{EntityName}}Repository extends JpaRepository<{{EntityName}}, Long> {

    // -- 조회 + 예외 조합 (default 메서드 패턴) --

    default {{EntityName}} getById(Long id) {
        return findById(id)
                .orElseThrow(() -> new {{EntityName}}NotFoundException(id));
    }

    // -- 쿼리 메서드 --

{{#queryMethods}}
    {{returnType}} {{methodName}}({{#params}}{{type}} {{name}}{{^last}}, {{/last}}{{/params}});

{{/queryMethods}}

    // -- Interface-based Projection 예시 --
    // 필요한 필드만 조회하여 성능 최적화
    //
    // interface {{EntityName}}Summary {
    //     Long getId();
    //     String getName();
    // }
    //
    // List<{{EntityName}}Summary> findAllProjectedBy();
}

// ============================================================
// QueryDSL Custom Repository (복잡한 동적 쿼리가 필요한 경우)
// ============================================================
//
// 1. Custom 인터페이스 정의
// ─────────────────────────────
// package {{basePackage}}.domain.{{domainNameLower}}.repository;
//
// import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}Response;
// import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}SearchCondition;
// import org.springframework.data.domain.Page;
// import org.springframework.data.domain.Pageable;
//
// public interface {{EntityName}}RepositoryCustom {
//     Page<{{EntityName}}Response> search({{EntityName}}SearchCondition condition, Pageable pageable);
// }
//
// 2. 구현체 ({Name}RepositoryImpl 네이밍 필수)
// ─────────────────────────────
// package {{basePackage}}.domain.{{domainNameLower}}.repository;
//
// import static {{basePackage}}.domain.{{domainNameLower}}.entity.Q{{EntityName}}.{{entityName}};
//
// import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}Response;
// import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}SearchCondition;
// import com.querydsl.core.types.Projections;
// import com.querydsl.core.types.dsl.BooleanExpression;
// import com.querydsl.jpa.impl.JPAQueryFactory;
// import lombok.RequiredArgsConstructor;
// import org.springframework.data.domain.Page;
// import org.springframework.data.domain.Pageable;
// import org.springframework.data.support.PageableExecutionUtils;
//
// @RequiredArgsConstructor
// public class {{EntityName}}RepositoryImpl implements {{EntityName}}RepositoryCustom {
//
//     private final JPAQueryFactory queryFactory;
//
//     @Override
//     public Page<{{EntityName}}Response> search({{EntityName}}SearchCondition condition, Pageable pageable) {
//         var content = queryFactory
//                 .select(Projections.constructor({{EntityName}}Response.class,
//                         {{entityName}}.id,
//                         {{entityName}}.name,
//                         {{entityName}}.createdAt))
//                 .from({{entityName}})
//                 .where(
//                         nameContains(condition.name())
//                 )
//                 .offset(pageable.getOffset())
//                 .limit(pageable.getPageSize())
//                 .orderBy({{entityName}}.id.desc())
//                 .fetch();
//
//         var countQuery = queryFactory
//                 .select({{entityName}}.count())
//                 .from({{entityName}})
//                 .where(
//                         nameContains(condition.name())
//                 );
//
//         return PageableExecutionUtils.getPage(content, pageable, countQuery::fetchOne);
//     }
//
//     // BooleanExpression: null 반환 시 where()에서 자동 무시 → 동적 쿼리 핵심
//     private BooleanExpression nameContains(String name) {
//         return name != null ? {{entityName}}.name.containsIgnoreCase(name) : null;
//     }
// }
//
// 3. 메인 Repository에 Custom 상속 추가
// ─────────────────────────────
// public interface {{EntityName}}Repository
//         extends JpaRepository<{{EntityName}}, Long>, {{EntityName}}RepositoryCustom {
//     ...
// }
//
// 4. 검색 조건 DTO (record)
// ─────────────────────────────
// package {{basePackage}}.domain.{{domainNameLower}}.dto;
//
// public record {{EntityName}}SearchCondition(
//         String name
// ) {}
