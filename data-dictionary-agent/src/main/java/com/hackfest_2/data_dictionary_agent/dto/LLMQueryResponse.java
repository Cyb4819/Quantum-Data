package com.hackfest_2.data_dictionary_agent.dto;

import com.fasterxml.jackson.databind.JsonNode;

public record LLMQueryResponse(
    String status,
    String intent,
    String sql,
    String response,
    String collection,
    JsonNode filter,
    JsonNode projection,
    Integer limit) {}
