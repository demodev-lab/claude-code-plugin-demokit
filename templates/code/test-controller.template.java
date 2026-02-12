package {{basePackage}}.domain.{{domainNameLower}}.controller;

import {{basePackage}}.domain.{{domainNameLower}}.dto.Create{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.Update{{EntityName}}Request;
import {{basePackage}}.domain.{{domainNameLower}}.dto.{{EntityName}}Response;
import {{basePackage}}.domain.{{domainNameLower}}.exception.{{EntityName}}NotFoundException;
import {{basePackage}}.domain.{{domainNameLower}}.service.{{EntityName}}Service;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willDoNothing;
import static org.mockito.BDDMockito.willThrow;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({{EntityName}}Controller.class)
class {{EntityName}}ControllerTest {

    @Autowired
    MockMvc mockMvc;

    @Autowired
    ObjectMapper objectMapper;

    @MockitoBean
    {{EntityName}}Service {{entityName}}Service;

    private static final String BASE_URL = "/api/v1/{{resourceName}}";

    private {{EntityName}}Response createResponse() {
        return new {{EntityName}}Response(
                1L,
{{#responseFieldValues}}
                {{value}},
{{/responseFieldValues}}
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Nested
    @DisplayName("POST " + BASE_URL)
    class Create {

        @Test
        @DisplayName("201 Created - 정상 생성")
        void success() throws Exception {
            // given
            var request = new Create{{EntityName}}Request({{#createFieldValues}}{{value}}{{^last}}, {{/last}}{{/createFieldValues}});
            var response = createResponse();

            given({{entityName}}Service.create(any()))
                    .willReturn(response);

            // when & then
            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(header().exists("Location"))
                    .andExpect(jsonPath("$.id").value(1));
        }

        @Test
        @DisplayName("400 Bad Request - 유효성 검증 실패")
        void validationFail() throws Exception {
            // given
            var invalidRequest = new Create{{EntityName}}Request({{#invalidFieldValues}}{{value}}{{^last}}, {{/last}}{{/invalidFieldValues}});

            // when & then
            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest());
        }
    }

    @Nested
    @DisplayName("GET " + BASE_URL + "/{id}")
    class FindById {

        @Test
        @DisplayName("200 OK - 정상 조회")
        void success() throws Exception {
            // given
            var response = createResponse();

            given({{entityName}}Service.findById(1L))
                    .willReturn(response);

            // when & then
            mockMvc.perform(get(BASE_URL + "/{id}", 1L))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1));
        }

        @Test
        @DisplayName("404 Not Found - 존재하지 않는 리소스")
        void notFound() throws Exception {
            // given
            given({{entityName}}Service.findById(999L))
                    .willThrow(new {{EntityName}}NotFoundException(999L));

            // when & then
            mockMvc.perform(get(BASE_URL + "/{id}", 999L))
                    .andExpect(status().isNotFound());
        }
    }

    @Nested
    @DisplayName("GET " + BASE_URL)
    class FindAll {

        @Test
        @DisplayName("200 OK - 페이징 조회")
        void success() throws Exception {
            // given
            var response = createResponse();
            var page = new PageImpl<>(List.of(response), PageRequest.of(0, 10), 1);

            given({{entityName}}Service.findAll(any()))
                    .willReturn(page);

            // when & then
            mockMvc.perform(get(BASE_URL)
                            .param("page", "0")
                            .param("size", "10"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.content").isArray())
                    .andExpect(jsonPath("$.content.length()").value(1))
                    .andExpect(jsonPath("$.totalElements").value(1));
        }
    }

    @Nested
    @DisplayName("PUT " + BASE_URL + "/{id}")
    class Update {

        @Test
        @DisplayName("200 OK - 정상 수정")
        void success() throws Exception {
            // given
            var request = new Update{{EntityName}}Request({{#updateFieldValues}}{{value}}{{^last}}, {{/last}}{{/updateFieldValues}});
            var response = createResponse();

            given({{entityName}}Service.update(eq(1L), any()))
                    .willReturn(response);

            // when & then
            mockMvc.perform(put(BASE_URL + "/{id}", 1L)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.id").value(1));
        }
    }

    @Nested
    @DisplayName("DELETE " + BASE_URL + "/{id}")
    class Delete {

        @Test
        @DisplayName("204 No Content - 정상 삭제")
        void success() throws Exception {
            // given
            willDoNothing().given({{entityName}}Service).delete(1L);

            // when & then
            mockMvc.perform(delete(BASE_URL + "/{id}", 1L))
                    .andExpect(status().isNoContent());
        }

        @Test
        @DisplayName("404 Not Found - 존재하지 않는 리소스 삭제")
        void notFound() throws Exception {
            // given
            willThrow(new {{EntityName}}NotFoundException(999L))
                    .given({{entityName}}Service).delete(999L);

            // when & then
            mockMvc.perform(delete(BASE_URL + "/{id}", 999L))
                    .andExpect(status().isNotFound());
        }
    }
}
