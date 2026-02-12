package {{basePackage}}.domain.{{domainNameLower}}.service;

import {{basePackage}}.domain.{{domainNameLower}}.entity.{{EntityName}};
import {{basePackage}}.domain.{{domainNameLower}}.dto.Create{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.Update{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}Response;
import {{basePackage}}.domain.{{domainNameLower}}.exception.{{EntityName}}NotFoundException;
import {{basePackage}}.domain.{{domainNameLower}}.repository.{{EntityName}}Repository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

@ExtendWith(MockitoExtension.class)
class {{EntityName}}ServiceTest {

    @InjectMocks
    {{EntityName}}Service {{entityName}}Service;

    @Mock
    {{EntityName}}Repository {{entityName}}Repository;

    @Nested
    @DisplayName("create")
    class Create {

        @Test
        @DisplayName("정상적으로 생성한다")
        void success() {
            // given
            var request = new Create{{EntityName}}Request({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});
            var entity = {{EntityName}}.create({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});

            given({{entityName}}Repository.save(any({{EntityName}}.class)))
                    .willReturn(entity);

            // when
            var response = {{entityName}}Service.create(request);

            // then
            assertThat(response).isNotNull();
            then({{entityName}}Repository).should().save(any({{EntityName}}.class));
        }
    }

    @Nested
    @DisplayName("findById")
    class FindById {

        @Test
        @DisplayName("존재하는 ID로 조회한다")
        void success() {
            // given
            var entity = {{EntityName}}.create({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});

            given({{entityName}}Repository.getById(1L))
                    .willReturn(entity);

            // when
            var response = {{entityName}}Service.findById(1L);

            // then
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("존재하지 않는 ID로 조회 시 예외를 던진다")
        void notFound() {
            // given
            given({{entityName}}Repository.getById(999L))
                    .willThrow(new {{EntityName}}NotFoundException(999L));

            // when & then
            assertThatThrownBy(() -> {{entityName}}Service.findById(999L))
                    .isInstanceOf({{EntityName}}NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("findAll")
    class FindAll {

        @Test
        @DisplayName("페이징 조회한다")
        void success() {
            // given
            var pageable = PageRequest.of(0, 10);
            var entity = {{EntityName}}.create({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});
            var page = new PageImpl<>(List.of(entity), pageable, 1);

            given({{entityName}}Repository.findAll(pageable))
                    .willReturn(page);

            // when
            var result = {{entityName}}Service.findAll(pageable);

            // then
            assertThat(result.getContent()).hasSize(1);
            assertThat(result.getTotalElements()).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("정상적으로 삭제한다")
        void success() {
            // given
            var entity = {{EntityName}}.create({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});

            given({{entityName}}Repository.getById(1L))
                    .willReturn(entity);

            // when
            {{entityName}}Service.delete(1L);

            // then
            then({{entityName}}Repository).should().delete(entity);
        }
    }
}
