package {{basePackage}}.domain.{{domainNameLower}}.dto;

import {{basePackage}}.domain.{{domainNameLower}}.entity.{{EntityName}};
import jakarta.validation.constraints.*;

import java.time.LocalDateTime;

// -- Request DTOs (record) --

public record Create{{EntityName}}Request(
{{#createFields}}
        {{#validation}}@{{validation}} {{/validation}}{{type}} {{name}}{{^last}},{{/last}}
{{/createFields}}
) {}

// -- Update는 별도 파일 또는 같은 파일에 선언 --

public record Update{{EntityName}}Request(
{{#updateFields}}
        {{#validation}}@{{validation}} {{/validation}}{{type}} {{name}}{{^last}},{{/last}}
{{/updateFields}}
) {}

// -- Response DTO (record + 정적 팩토리) --

public record {{EntityName}}Response(
        Long id,
{{#responseFields}}
        {{type}} {{name}},
{{/responseFields}}
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static {{EntityName}}Response from({{EntityName}} {{entityName}}) {
        return new {{EntityName}}Response(
                {{entityName}}.getId(),
{{#responseFields}}
                {{entityName}}.get{{NameCapital}}(),
{{/responseFields}}
                {{entityName}}.getCreatedAt(),
                {{entityName}}.getUpdatedAt()
        );
    }
}
