package com.hackfest_2.data_dictionary_agent.dto;

import java.util.List;
import java.util.Map;

public record LLMQueryRequest(List<Map<String, Object>> messages, Object schema) {}
