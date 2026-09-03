package com.hackfest_2.data_dictionary_agent.controller;

import com.hackfest_2.data_dictionary_agent.dto.LLMQueryResponse;
import com.hackfest_2.data_dictionary_agent.service.LLMService;
import com.hackfest_2.data_dictionary_agent.service.QueryService;
import java.util.List;
import java.util.Map;
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
  public Object chat(@RequestBody Map<String, Object> request) {
    List<Map<String, Object>> messages = (List<Map<String, Object>>) request.get("messages");
    Object schema = request.get("schema");
    LLMQueryResponse llm = llmService.analyze(schema, messages);

    return switch (llm.intent()) {
      case "SCHEMA" -> handleSchema(llm);
      case "QUERY" -> handleQuery(llm);
      case "MIXED" -> handleMixed(llm, schema);
      default -> throw new RuntimeException("Unknown intent: " + llm.intent());
    };
  }

  private Object handleSchema(LLMQueryResponse llm) {
    return Map.of("intent", "SCHEMA", "response", llm.response());
  }

  private Object handleQuery(LLMQueryResponse llm) {
    try {
      List<Map<String, Object>> results = queryService.execute(llm.sql());

      return Map.of(
          "intent", "QUERY", "sql", llm.sql(), "response", llm.response(), "results", results);
    } catch (Exception e) {
      throw new RuntimeException("Query execution failed", e);
    }
  }

  private Object handleMixed(LLMQueryResponse llm, Object schema) {
    try {
      List<Map<String, Object>> results = queryService.execute(llm.sql());

      return Map.of(
          "intent",
          "MIXED",
          "sql",
          llm.sql(),
          "response",
          llm.response(),
          "schema",
          schema,
          "results",
          results);
    } catch (Exception e) {
      throw new RuntimeException("Query execution failed", e);
    }
  }
}
