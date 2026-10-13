package com.hackfest_2.data_dictionary_agent.controller;

import com.hackfest_2.data_dictionary_agent.dto.ChatRequest;
import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
import com.hackfest_2.data_dictionary_agent.dto.LLMQueryResponse;
import com.hackfest_2.data_dictionary_agent.service.LLMService;
import com.hackfest_2.data_dictionary_agent.service.QueryService;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/chat")
public class ChatController {
  private final LLMService llmService;
  private final QueryService queryService;

  public ChatController(LLMService llmService, QueryService queryService) {
    this.llmService = llmService;
    this.queryService = queryService;
  }

  @PostMapping
  public Object chat(@RequestBody ChatRequest request) throws Exception {
    DBConnectionConfig databaseConfig = request.databaseConfig();
    String databaseType =
        databaseConfig == null || databaseConfig.getType() == null
            ? "mysql"
            : databaseConfig.getType();
    LLMQueryResponse llm =
        llmService.analyze(request.schema(), request.messages(), databaseType);

    return switch (llm.intent()) {
      case "SCHEMA" -> schemaResponse(llm);
      case "QUERY" -> queryResponse(llm, databaseConfig, null);
      case "MIXED" -> queryResponse(llm, databaseConfig, request.schema());
      default -> throw new IllegalArgumentException("Unknown intent: " + llm.intent());
    };
  }

  @ExceptionHandler(RestClientResponseException.class)
  public ResponseEntity<Map<String, String>> handleLlmError(
      RestClientResponseException exception) {
    boolean rateLimited = exception.getStatusCode().value() == 429;
    String message =
        rateLimited
            ? "AI provider rate limit reached. Please wait and try again."
            : "AI provider request failed.";
    return ResponseEntity.status(rateLimited ? 429 : 502).body(Map.of("error", message));
  }

  private Map<String, Object> schemaResponse(LLMQueryResponse llm) {
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("intent", "SCHEMA");
    response.put("response", llm.response());
    return response;
  }

  private Map<String, Object> queryResponse(
      LLMQueryResponse llm, DBConnectionConfig config, Object schema) throws Exception {
    List<Map<String, Object>> results = queryService.execute(llm, config);
    Map<String, Object> response = new LinkedHashMap<>();
    response.put("intent", llm.intent());
    response.put("response", llm.response());
    response.put("results", results);
    if (llm.sql() != null) {
      response.put("sql", llm.sql());
    }
    if (llm.collection() != null) {
      response.put("collection", llm.collection());
      response.put("filter", llm.filter());
      response.put("projection", llm.projection());
    }
    if (schema != null) {
      response.put("schema", schema);
    }
    return response;
  }
}
