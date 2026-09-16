package com.hackfest_2.data_dictionary_agent.dto;

public record LLMQueryResponse(String status, String intent, String sql, String response) {}
