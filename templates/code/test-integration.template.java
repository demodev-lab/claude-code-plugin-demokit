package {{basePackage}}.domain.{{domainNameLower}}.repository;

import {{basePackage}}.domain.{{domainNameLower}}.entity.{{EntityName}};
import {{basePackage}}.domain.{{domainNameLower}}.exception.{{EntityName}}NotFoundException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.data.domain.PageRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DataJpaTest
class {{EntityName}}RepositoryTest {

    @Autowired
    {{EntityName}}Repository {{entityName}}Repository;

    @Autowired
    TestEntityManager em;

    private {{EntityName}} persist{{EntityName}}() {
        var entity = {{EntityName}}.create({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});
        em.persistAndFlush(entity);
        em.clear();
        return entity;
    }

    @Nested
    @DisplayName("getById")
    class GetById {

        @Test
        @DisplayName("존재하는 ID로 조회한다")
        void success() {
            // given
            var saved = persist{{EntityName}}();

            // when
            var found = {{entityName}}Repository.getById(saved.getId());

            // then
            assertThat(found.getId()).isEqualTo(saved.getId());
        }

        @Test
        @DisplayName("존재하지 않는 ID로 조회 시 예외를 던진다")
        void notFound() {
            // when & then
            assertThatThrownBy(() -> {{entityName}}Repository.getById(999L))
                    .isInstanceOf({{EntityName}}NotFoundException.class);
        }
    }

    @Nested
    @DisplayName("findAll")
    class FindAll {

        @Test
        @DisplayName("페이징 조회한다")
        void withPaging() {
            // given
            persist{{EntityName}}();

            // when
            var page = {{entityName}}Repository.findAll(PageRequest.of(0, 10));

            // then
            assertThat(page.getContent()).hasSize(1);
        }
    }

    @Nested
    @DisplayName("save")
    class Save {

        @Test
        @DisplayName("엔티티를 저장한다")
        void success() {
            // given
            var entity = {{EntityName}}.create({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});

            // when
            var saved = {{entityName}}Repository.save(entity);

            // then
            assertThat(saved.getId()).isNotNull();
        }
    }

    @Nested
    @DisplayName("delete")
    class Delete {

        @Test
        @DisplayName("엔티티를 삭제한다")
        void success() {
            // given
            var saved = persist{{EntityName}}();

            // when
            {{entityName}}Repository.delete(saved);
            em.flush();
            em.clear();

            // then
            assertThat({{entityName}}Repository.findById(saved.getId())).isEmpty();
        }
    }
}
