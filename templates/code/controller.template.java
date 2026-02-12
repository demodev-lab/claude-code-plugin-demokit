package {{basePackage}}.domain.{{domainNameLower}}.controller;

import {{basePackage}}.domain.{{domainNameLower}}.dto.Create{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.Update{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}Response;
import {{basePackage}}.domain.{{domainNameLower}}.service.{{EntityName}}Service;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/v1/{{resourceName}}")
@RequiredArgsConstructor
public class {{EntityName}}Controller {

    private final {{EntityName}}Service {{entityName}}Service;

    @PostMapping
    ResponseEntity<{{EntityName}}Response> create(@Valid @RequestBody Create{{EntityName}}Request request) {
        var response = {{entityName}}Service.create(request);
        return ResponseEntity
                .created(URI.create("/api/v1/{{resourceName}}/" + response.id()))
                .body(response);
    }

    @GetMapping("/{id}")
    {{EntityName}}Response findById(@PathVariable Long id) {
        return {{entityName}}Service.findById(id);
    }

    @GetMapping
    Page<{{EntityName}}Response> findAll(Pageable pageable) {
        return {{entityName}}Service.findAll(pageable);
    }

    @PutMapping("/{id}")
    {{EntityName}}Response update(
            @PathVariable Long id,
            @Valid @RequestBody Update{{EntityName}}Request request) {
        return {{entityName}}Service.update(id, request);
    }

    @DeleteMapping("/{id}")
    ResponseEntity<Void> delete(@PathVariable Long id) {
        {{entityName}}Service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
