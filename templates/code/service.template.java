package {{basePackage}}.domain.{{domainNameLower}}.service;

import {{basePackage}}.domain.{{domainNameLower}}.entity.{{EntityName}};
import {{basePackage}}.domain.{{domainNameLower}}.dto.Create{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.Update{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}Response;
import {{basePackage}}.domain.{{domainNameLower}}.repository.{{EntityName}}Repository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class {{EntityName}}Service {

    private final {{EntityName}}Repository {{entityName}}Repository;

    @Transactional
    public {{EntityName}}Response create(Create{{EntityName}}Request request) {
        var {{entityName}} = {{EntityName}}.create(
{{#createFields}}
                request.{{name}}(){{^last}},{{/last}}
{{/createFields}}
        );
        {{entityName}}Repository.save({{entityName}});
        return {{EntityName}}Response.from({{entityName}});
    }

    @Transactional(readOnly = true)
    public {{EntityName}}Response findById(Long id) {
        var {{entityName}} = {{entityName}}Repository.getById(id);
        return {{EntityName}}Response.from({{entityName}});
    }

    @Transactional(readOnly = true)
    public Page<{{EntityName}}Response> findAll(Pageable pageable) {
        return {{entityName}}Repository.findAll(pageable)
                .map({{EntityName}}Response::from);
    }

    @Transactional
    public {{EntityName}}Response update(Long id, Update{{EntityName}}Request request) {
        var {{entityName}} = {{entityName}}Repository.getById(id);
        {{entityName}}.update(
{{#updateFields}}
                request.{{name}}(){{^last}},{{/last}}
{{/updateFields}}
        );
        return {{EntityName}}Response.from({{entityName}});
    }

    @Transactional
    public void delete(Long id) {
        var {{entityName}} = {{entityName}}Repository.getById(id);
        {{entityName}}Repository.delete({{entityName}});
    }
}
