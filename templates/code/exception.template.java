package {{basePackage}}.domain.{{domainNameLower}}.exception;

// -- 도메인별 커스텀 예외 (각 도메인 패키지 내부) --

public class {{EntityName}}NotFoundException extends RuntimeException {

    private final Long id;

    public {{EntityName}}NotFoundException(Long id) {
        super("{{EntityName}} with id %d was not found".formatted(id));
        this.id = id;
    }

    public Long getId() {
        return id;
    }
}

// -- GlobalExceptionHandler (ProblemDetail 기반, RFC 9457) --
// 아래 코드는 common/exception/GlobalExceptionHandler.java 로 생성

/*
package {{basePackage}}.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

import java.net.URI;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler extends ResponseEntityExceptionHandler {

    @ExceptionHandler({{EntityName}}NotFoundException.class)
    ProblemDetail handleNotFound({{EntityName}}NotFoundException ex) {
        log.warn("리소스를 찾을 수 없음: {}", ex.getMessage());

        var pd = ProblemDetail.forStatusAndDetail(
                HttpStatus.NOT_FOUND, ex.getMessage());
        pd.setTitle("{{EntityName}} Not Found");
        pd.setType(URI.create("/errors/{{domainNameLower}}-not-found"));
        pd.setProperty("{{entityName}}Id", ex.getId());
        return pd;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail handleBadRequest(IllegalArgumentException ex) {
        log.warn("잘못된 요청: {}", ex.getMessage());

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail handleInternalError(Exception ex) {
        log.error("서버 내부 오류", ex);

        return ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "서버 내부 오류가 발생했습니다");
    }
}
*/
