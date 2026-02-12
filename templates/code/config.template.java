package {{basePackage}}.common.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

// -- JPA Auditing 설정 --

@Configuration
@EnableJpaAuditing
public class JpaAuditingConfig {
}

// -- BaseEntity (domain 패키지에 위치) --
// 아래 코드는 common/domain/BaseEntity.java 로 생성

/*
package {{basePackage}}.common.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EntityListeners;
import jakarta.persistence.MappedSuperclass;
import lombok.Getter;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

@Getter
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
public abstract class BaseEntity {

    @CreatedDate
    @Column(updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
*/

// -- QueryDSL 설정 --
// 복잡한 동적 쿼리에 QueryDSL 사용 시 아래 설정 추가
// OpenFeign fork (보안 패치): io.github.openfeign.querydsl:querydsl-jpa:6.12
// ※ com.querydsl:querydsl-jpa:5.x 사용 금지

/*
package {{basePackage}}.common.config;

import com.querydsl.jpa.impl.JPAQueryFactory;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class QuerydslConfig {

    @Bean
    JPAQueryFactory jpaQueryFactory(EntityManager entityManager) {
        return new JPAQueryFactory(entityManager);
    }
}
*/

// -- 외부 API 호출용 WebClient 설정 --
// 필요 시 아래 코드를 config/ 패키지에 추가
// 의존성: spring-boot-starter-webflux

/*
package {{basePackage}}.common.config;

import io.netty.channel.ChannelOption;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.client.reactive.ReactorClientHttpConnector;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.netty.http.client.HttpClient;

import java.time.Duration;

@Configuration
public class WebClientConfig {

    @Bean
    WebClient webClient(WebClient.Builder builder) {
        var httpClient = HttpClient.create()
                .option(ChannelOption.CONNECT_TIMEOUT_MILLIS, 5_000)
                .responseTimeout(Duration.ofSeconds(5));

        return builder
                .clientConnector(new ReactorClientHttpConnector(httpClient))
                .defaultHeader(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_JSON_VALUE)
                .build();
    }
}
*/

// -- @ConfigurationProperties with record (Java 21) --
// 불변 설정 프로퍼티를 record로 선언

/*
package {{basePackage}}.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public record AppProperties(
        String name,
        String version,
        Api api
) {
    public record Api(
            String baseUrl,
            int timeout,
            int maxRetries
    ) {}
}
*/
