package com.hackfest_2.data_dictionary_agent.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackfest_2.data_dictionary_agent.dto.LLMQueryRequest;
import com.hackfest_2.data_dictionary_agent.dto.LLMQueryResponse;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class LLMService {

  private final RestClient restClient;
  private final ObjectMapper objectMapper;

  public LLMService(
      RestClient.Builder builder,
      ObjectMapper objectMapper,
      @Value("${llm.base-url}") String baseUrl) {
    SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
    this.restClient = builder.baseUrl(baseUrl).requestFactory(requestFactory).build();
    this.objectMapper = objectMapper;
  }

  public LLMQueryResponse analyze(Object schema, List<Map<String, Object>> messages) {
    LLMQueryRequest request = new LLMQueryRequest(messages, schema);

    try {
      String json = objectMapper.writeValueAsString(request);
      String rawResponse =
          restClient
              .post()
              .uri("/api/ai/query")
              .contentType(MediaType.APPLICATION_JSON)
              .accept(MediaType.APPLICATION_JSON)
              .body(json)
              .retrieve()
              .body(String.class);

      return objectMapper.readValue(rawResponse, LLMQueryResponse.class);
    } catch (Exception e) {
      e.printStackTrace();
      throw new RuntimeException("LLM request failed", e);
    }
  }
}
