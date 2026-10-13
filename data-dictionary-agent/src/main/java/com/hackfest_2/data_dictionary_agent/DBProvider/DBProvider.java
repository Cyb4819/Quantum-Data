package com.hackfest_2.data_dictionary_agent.DBProvider;

import com.hackfest_2.data_dictionary_agent.dto.DBConnectionConfig;
public interface DBProvider {
  AutoCloseable connect(DBConnectionConfig config) throws Exception;

  boolean supports(String type);
}
