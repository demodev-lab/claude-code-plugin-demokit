package {{basePackage}}.domain.{{domainNameLower}}.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

{{#hasBaseEntity}}
import {{basePackage}}.common.domain.BaseEntity;
{{/hasBaseEntity}}

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(name = "{{tableName}}"{{#indexes}},
    indexes = {
{{#indexes}}
        @Index(name = "idx_{{tableName}}_{{columnName}}", columnList = "{{columnName}}"){{^last}},{{/last}}
{{/indexes}}
    }
{{/indexes}})
{{#softDelete}}
@SQLRestriction("deleted = false")
{{/softDelete}}
public class {{EntityName}} {{#hasBaseEntity}}extends BaseEntity {{/hasBaseEntity}}{

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

{{#fields}}
    @Column({{columnAnnotation}})
    private {{type}} {{name}};

{{/fields}}
{{#relations}}
    @{{relationType}}(fetch = FetchType.{{fetchType}})
    @JoinColumn(name = "{{joinColumnName}}")
    private {{targetType}} {{targetName}};

{{/relations}}
{{#softDelete}}
    @Column(nullable = false)
    private boolean deleted = false;

{{/softDelete}}
    @Builder
    private {{EntityName}}({{#constructorParams}}{{type}} {{name}}{{^last}}, {{/last}}{{/constructorParams}}) {
{{#constructorParams}}
        this.{{name}} = {{name}};
{{/constructorParams}}
    }

    // -- 정적 팩토리 메서드 --

    public static {{EntityName}} create({{#constructorParams}}{{type}} {{name}}{{^last}}, {{/last}}{{/constructorParams}}) {
        return {{EntityName}}.builder()
{{#constructorParams}}
                .{{name}}({{name}})
{{/constructorParams}}
                .build();
    }

    // -- 비즈니스 메서드 --

    public void update({{#updateParams}}{{type}} {{name}}{{^last}}, {{/last}}{{/updateParams}}) {
{{#updateParams}}
        this.{{name}} = {{name}};
{{/updateParams}}
    }

{{#softDelete}}
    public void softDelete() {
        this.deleted = true;
    }

{{/softDelete}}
}
